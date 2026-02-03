# decode.py
# Décodage BACnet TrendLog (logBuffer / property 131) → liste de records structurés.
# - Récupère itemData (souvent un 'Any') et le convertit en TagList natif via cast_out(...)
# - Décode: [0]timestamp(Date+Time) + [1]logDatum(CHOICE) + [2]statusFlags (optionnel)
# - Tolérant aux variantes bacpypes3 (différentes implémentations de TagList/Tag)

from typing import Any, Dict, List, Optional, Tuple

# Primitifs BACnet
from bacpypes3.primitivedata import (
    Boolean, Unsigned, Integer, Real, Double, Enumerated, BitString, Null,
    CharacterString, Date, Time,
)

# ========= TagList & Tag : import multi-chemins + shim =========
_TagListCandidates = []
_TagCls = None

def _try_imports():
    global _TagListCandidates, _TagCls
    # TagList (plusieurs emplacements selon versions)
    for mod, name in (
        ("bacpypes3.encoding", "TagList"),
        ("bacpypes3.tagging", "TagList"),
        ("bacpypes3.tag", "TagList"),
    ):
        try:
            m = __import__(mod, fromlist=[name])
            TL = getattr(m, name)
            _TagListCandidates.append(TL)
        except Exception:
            pass
    # Tag (classe de base des tags)
    for mod, name in (
        ("bacpypes3.encoding", "Tag"),
        ("bacpypes3.tagging", "Tag"),
        ("bacpypes3.tag", "Tag"),
    ):
        try:
            m = __import__(mod, fromlist=[name])
            _TagCls = getattr(m, name)
            break
        except Exception:
            pass

_try_imports()

# Shim TagList si aucune implémentation trouvée (rare)
if not _TagListCandidates:
    class _ShimTagList(list):
        def pop(self):  # pop du début (comme bacpypes3)
            if not self:
                raise IndexError("pop from empty TagList")
            return super().pop(0)
        def peek(self):
            if not self:
                raise IndexError("peek from empty TagList")
            return self[0]
    _TagListCandidates.append(_ShimTagList)

TagList = _TagListCandidates[0]  # celui qu’on utilisera par défaut

# ============== Utils bas niveau (agnostiques de la version) ==============

def _clsname(x: Any) -> str:
    return getattr(x, "__class__", type(x)).__name__

def _get_ctx(tag: Any) -> Optional[int]:
    # Opening/ClosingTag: souvent .context
    if hasattr(tag, "context"):
        try:
            return int(getattr(tag, "context"))
        except Exception:
            pass
    # fallback: certains tags ont .tagNumber comme porteur du contexte
    if hasattr(tag, "tagNumber"):
        try:
            return int(getattr(tag, "tagNumber"))
        except Exception:
            pass
    
    # Extraire le contexte de la représentation string "context(number)"
    tag_str = str(tag)
    if "context(" in tag_str:
        try:
            start = tag_str.find("context(") + 8
            end = tag_str.find(")", start)
            if end > start:
                return int(tag_str[start:end])
        except (ValueError, IndexError):
            pass
    
    return None

def _is_opening(tag: Any, ctx: Optional[int] = None) -> bool:
    # Vérifier le nom de classe
    cls_name = _clsname(tag)
    if cls_name == "OpeningTag":
        return True if ctx is None else (_get_ctx(tag) == ctx)
    
    # Vérifier la représentation string pour "open(context)"
    tag_str = str(tag)
    if "open(" in tag_str:
        if ctx is None:
            return True
        # Extraire le contexte de "open(context)"
        try:
            start = tag_str.find("open(") + 5
            end = tag_str.find(")", start)
            if end > start:
                tag_ctx = int(tag_str[start:end])
                return tag_ctx == ctx
        except (ValueError, IndexError):
            pass
    
    # Certaines versions codent l'info dans .tagClass ; on ne s'y appuie pas ici.
    return False

def _is_closing(tag: Any, ctx: Optional[int] = None) -> bool:
    # Vérifier le nom de classe
    cls_name = _clsname(tag)
    if cls_name == "ClosingTag":
        return True if ctx is None else (_get_ctx(tag) == ctx)
    
    # Vérifier la représentation string pour "close(context)"
    tag_str = str(tag)
    if "close(" in tag_str:
        if ctx is None:
            return True
        # Extraire le contexte de "close(context)"
        try:
            start = tag_str.find("close(") + 6
            end = tag_str.find(")", start)
            if end > start:
                tag_ctx = int(tag_str[start:end])
                return tag_ctx == ctx
        except (ValueError, IndexError):
            pass
    
    return False

def _tag_class_name(tag: Any) -> str:
    # Tente d’identifier application/context
    tc = getattr(tag, "tagClass", None)
    s = str(tc).lower()
    if "application" in s:
        return "application"
    if "context" in s:
        return "context"
    # fallback: Tag de base sans info exploitable → on essaiera de le décoder avec les primitifs
    return "unknown"

def _is_application(tag: Any) -> bool:
    return _clsname(tag) in ("ApplicationTag",) or _tag_class_name(tag) == "application"

def _is_context(tag: Any) -> bool:
    # Vérifier le nom de classe
    if _clsname(tag) in ("ContextTag",):
        return True
    
    # Vérifier la représentation string pour "context(...)"
    tag_str = str(tag)
    if "context(" in tag_str:
        return True
    
    # Vérifier via tag_class_name
    return _tag_class_name(tag) == "context"

def _tl_pop(toks: List[Any]) -> Any:
    if not toks:
        raise IndexError("empty TagList")
    return toks.pop(0)

def _tl_peek(toks: List[Any]) -> Optional[Any]:
    return toks[0] if toks else None

# ============== Cast itemData (Any) → TagList natif ==============

def _coerce_itemdata_to_taglist(item_data: Any) -> Optional[List[Any]]:
    """
    Essaye différentes stratégies pour obtenir une liste de tags à partir d’un Any/itemData.
    Retourne une liste (tags) ou None.
    """
    # 1) cast_out(TagList) via les candidats
    if hasattr(item_data, "cast_out"):
        for TL in _TagListCandidates:
            try:
                tl = item_data.cast_out(TL)  # type: ignore
                # Convertit en liste de tags Python pour un parsing simple
                return list(tl)
            except Exception:
                continue

    # 2) Attributs ‘tagList’ usuels
    for attr in ("tagList", "value", "tags"):
        try:
            v = getattr(item_data, attr)
            if v is not None:
                return list(v)
        except Exception:
            pass

    # 3) Si déjà itérable et ressemble à des tags (présence de tagNumber | context | tagClass)
    try:
        as_list = list(item_data)
        if as_list and any(hasattr(as_list[0], a) for a in ("tagNumber","context","tagClass")):
            return as_list
    except Exception:
        pass

    # 4) Gestion spéciale pour les objets Any qui ne sont pas des TagList
    # Certains objets Any peuvent contenir des données brutes
    try:
        # Essayer de traiter comme une séquence
        if hasattr(item_data, "__iter__") and not isinstance(item_data, (str, bytes)):
            return list(item_data)
    except Exception:
        pass

    return None

# ============== Décodage ApplicationTag → valeur Python lisible ==============

def _decode_app_value(tag: Any) -> Tuple[Any, str]:
    """
    Convertit un ApplicationTag/Tag(application) en (valeur Python, type logique).
    Utilise les primitifs bacpypes3.*.decode(TagList([tag])) pour fiabilité.
    """
    # tagNumber (application) : 0 Null, 1 Boolean, 2 Unsigned, 3 Integer, 4 Real,
    # 5 Double, 6 OctetString, 7 CharacterString, 8 BitString, 9 Enumerated,
    # 10 Date, 11 Time, 12 ObjectIdentifier
    tn = getattr(tag, "tagNumber", None)
    if tn is None:
        raise ValueError("Application tag without tagNumber")

    tl = TagList([tag])  # mono-tag

    if int(tn) == 0:
        Null().decode(tl);  return None, "null"
    if int(tn) == 1:
        obj = Boolean().decode(tl)
        return obj.value if hasattr(obj, 'value') else obj.cast_out(), "boolean"
    if int(tn) == 2:
        obj = Unsigned().decode(tl)
        return obj.value if hasattr(obj, 'value') else obj.cast_out(), "unsigned"
    if int(tn) == 3:
        obj = Integer().decode(tl)
        return obj.value if hasattr(obj, 'value') else obj.cast_out(), "integer"
    if int(tn) == 4:
        obj = Real().decode(tl)
        return obj.value if hasattr(obj, 'value') else obj.cast_out(), "real"
    if int(tn) == 5:
        obj = Double().decode(tl)
        return obj.value if hasattr(obj, 'value') else obj.cast_out(), "double"
    if int(tn) == 7:
        obj = CharacterString().decode(tl)
        return obj.value if hasattr(obj, 'value') else obj.cast_out(), "string"
    if int(tn) == 8:
        obj = BitString().decode(tl)
        return obj.value if hasattr(obj, 'value') else obj.cast_out(), "bitstring"
    if int(tn) == 9:
        obj = Enumerated().decode(tl)
        return obj.value if hasattr(obj, 'value') else obj.cast_out(), "enumerated"
    if int(tn) == 10:
        obj = Date().decode(tl)
        return obj.value if hasattr(obj, 'value') else obj.cast_out(), "date"
    if int(tn) == 11:
        obj = Time().decode(tl)
        return obj.value if hasattr(obj, 'value') else obj.cast_out(), "time"
    # 6 OctetString et 12 ObjectIdentifier : on renvoie une représentation str
    try:
        return str(tag), f"appTag({tn})"
    except Exception:
        return "<app-value>", f"appTag({tn})"

# ============== Timestamp (context [0] : Date + Time) ==============

def _nz_int(x: Optional[int]) -> int:
    if x is None or (isinstance(x, int) and x == 255):
        return 0
    return int(x)

def _iso_from_date_time(date_tuple, time_tuple) -> str:
    year, month, day, _dow = date_tuple
    hour, minute, second, hundredths = time_tuple
    y = year if (isinstance(year, int) and year not in (0, 255)) else 2000
    m = max(1, _nz_int(month))
    d = max(1, _nz_int(day))
    H = _nz_int(hour); M = _nz_int(minute); S = _nz_int(second)
    ms = int(_nz_int(hundredths)) * 10  # 1/100 s → ms
    return f"{int(y):04d}-{m:02d}-{d:02d}T{H:02d}:{M:02d}:{S:02d}.{ms:03d}"

def _decode_timestamp(tokens: List[Any]) -> str:
    # Sauter les tags d'ouverture de niveau supérieur jusqu'à trouver le bon contexte
    while tokens and not _is_opening(_tl_peek(tokens), 0):
        _tl_pop(tokens)  # Consommer le tag sans le traiter
    
    if not _is_opening(_tl_pop(tokens), 0):
        raise ValueError("Expected OpeningTag(0)")
    
    # Décoder la date
    d_tag = _tl_pop(tokens)                 # Date (app 10)
    d_obj = Date().decode(TagList([d_tag]))
    # Extraire la valeur selon la version de bacpypes3
    try:
        d_val = d_obj.value
    except AttributeError:
        try:
            d_val = d_obj.cast_out()
        except Exception:
            # Utiliser les attributs date/time natifs
            if hasattr(d_obj, 'date'):
                d = d_obj.date
                d_val = (d.year, d.month, d.day, d.weekday() + 1)  # weekday() retourne 0-6, on veut 1-7
            else:
                d_val = (2024, 1, 1, 1)  # Valeur par défaut
    
    # Décoder l'heure
    t_tag = _tl_pop(tokens)                 # Time (app 11)
    t_obj = Time().decode(TagList([t_tag]))
    # Extraire la valeur selon la version de bacpypes3
    try:
        t_val = t_obj.value
    except AttributeError:
        try:
            t_val = t_obj.cast_out()
        except Exception:
            # Utiliser les attributs date/time natifs
            if hasattr(t_obj, 'time'):
                t = t_obj.time
                t_val = (t.hour, t.minute, t.second, t.microsecond // 10000)  # microsecond -> centièmes
            else:
                t_val = (0, 0, 0, 0)  # Valeur par défaut
    
    if not _is_closing(_tl_pop(tokens), 0):
        raise ValueError("Expected ClosingTag(0)")
    return _iso_from_date_time(d_val, t_val)

# ============== logDatum (context [1] : CHOICE) ==============

def _decode_logdatum(tokens: List[Any]) -> Tuple[Any, str]:
    # Sauter les tags d'ouverture de niveau supérieur jusqu'à trouver le bon contexte
    while tokens and not _is_opening(_tl_peek(tokens), 1):
        _tl_pop(tokens)  # Consommer le tag sans le traiter
    
    if not _is_opening(_tl_pop(tokens), 1):
        raise ValueError("Expected OpeningTag(1)")
    tag = _tl_pop(tokens)

    # Cas le plus courant : tag application direct
    if _is_application(tag):
        val, kind = _decode_app_value(tag)
        if not _is_closing(_tl_pop(tokens), 1):
            raise ValueError("Expected ClosingTag(1)")
        return val, kind

    # Contexte fabricant : un tag contextuel suivi d'un app tag
    if _is_context(tag):
        ctx = _get_ctx(tag)
        nxt = _tl_peek(tokens)
        if nxt is not None and _is_application(nxt):
            app = _tl_pop(tokens)
            val, kind = _decode_app_value(app)
            if not _is_closing(_tl_pop(tokens), 1):
                raise ValueError("Expected ClosingTag(1)")
            # Ex.: context0/real, context10/string, …
            return val, f"context{ctx}/{kind}"
        else:
            # Tag contextuel sans tag application suivant - essayer de décoder directement
            try:
                # Pour les tags context(2), extraire les données brutes
                if ctx == 2:
                    # Extraire les données brutes du tag
                    if hasattr(tag, 'tag_data') and hasattr(tag, 'tag_lvt'):
                        tag_data = tag.tag_data
                        tag_lvt = tag.tag_lvt
                        
                        # Interpréter les données selon la longueur
                        if tag_lvt == 4:  # Probablement un Real (4 bytes)
                            try:
                                import struct
                                value = struct.unpack('>f', tag_data)[0]  # Big-endian float
                                return value, f"context{ctx}/real"
                            except Exception:
                                pass
                        elif tag_lvt == 2:  # Probablement un Unsigned (2 bytes)
                            try:
                                value = int.from_bytes(tag_data, byteorder='big')
                                return value, f"context{ctx}/unsigned"
                            except Exception:
                                pass
                        elif tag_lvt == 1:  # Probablement un Boolean ou Unsigned (1 byte)
                            try:
                                value = int.from_bytes(tag_data, byteorder='big')
                                return value, f"context{ctx}/unsigned"
                            except Exception:
                                pass
                        
                        # Si l'interprétation échoue, retourner les données brutes
                        return bytes(tag_data), f"context{ctx}/raw"
                    
                    # Essayer de décoder avec les primitifs BACnet
                    tl = TagList([tag])
                    # Essayer différents types selon le contexte
                    for primitive_class in [Real, Integer, Unsigned, Boolean, CharacterString]:
                        try:
                            obj = primitive_class().decode(tl)
                            if hasattr(obj, 'value'):
                                return obj.value, f"context{ctx}/{primitive_class.__name__.lower()}"
                            elif hasattr(obj, 'cast_out'):
                                return obj.cast_out(), f"context{ctx}/{primitive_class.__name__.lower()}"
                        except Exception:
                            continue
                
                # Essayer de traiter le tag contextuel comme une valeur primitive
                if hasattr(tag, 'value'):
                    return tag.value, f"context{ctx}/direct"
                elif hasattr(tag, 'cast_out'):
                    return tag.cast_out(), f"context{ctx}/cast"
                else:
                    # Si rien ne marche, retourner une représentation string
                    return str(tag), f"context{ctx}/string"
            except Exception:
                # En cas d'échec, retourner une représentation string
                return str(tag), f"context{ctx}/unknown"

    # Fallback : essayer str(tag)
    if not _is_closing(_tl_pop(tokens), 1):
        raise ValueError("Expected ClosingTag(1)")
    return (str(tag), "unknown")

# ============== statusFlags (context [2] : BitString) ==============

def _decode_status_flags(tokens: List[Any]) -> Optional[Dict[str, bool]]:
    peek = _tl_peek(tokens)
    if not peek or not _is_opening(peek, 2):
        return None
    _ = _tl_pop(tokens)  # OpeningTag(2)
    app = _tl_pop(tokens)  # Application BitString attendu
    obj = BitString().decode(TagList([app]))
    # Extraire la valeur selon la version de bacpypes3
    try:
        bits = obj.value
    except AttributeError:
        try:
            bits = obj.cast_out()
        except Exception:
            bits = list(obj)
    _ = _tl_pop(tokens)  # ClosingTag(2)

    def _bit(i: int) -> bool:
        try:
            return bool(bits[i])
        except Exception:
            return False

    return {
        "inAlarm": _bit(0),
        "fault": _bit(1),
        "overridden": _bit(2),
        "outOfService": _bit(3),
    }

# ============== API principale ==============

def decode_logbuffer_itemdata(item_data: Any) -> List[Dict[str, Any]]:
    """
    Décode ack.itemData (souvent de type 'Any') d’un ReadRangeACK(logBuffer)
    → liste de records: {timestamp, value, datatype, statusFlags}
    """
    tokens = _coerce_itemdata_to_taglist(item_data)
    if tokens is None:
        raise TypeError(f"itemData ne peut pas être converti en TagList (type={_clsname(item_data)})")

    tokens = list(tokens)  # on travaille sur une copie consommable
    records: List[Dict[str, Any]] = []

    while tokens:
        try:
            ts = _decode_timestamp(tokens)          # [0] Date+Time
            val, kind = _decode_logdatum(tokens)    # [1] CHOICE valeur
            flags = _decode_status_flags(tokens)    # [2] Optionnel
            records.append({
                "timestamp": ts,
                "value": val,
                "datatype": kind,
                "statusFlags": flags,
            })
        except Exception:
            # Si on tombe sur un séquenceur inattendu, on arrête proprement
            break

    return records

def format_readrange_ack(ack: Any, obj_str: str = "trend-log,unknown",
                         mode: str = "byPosition(?)") -> Dict[str, Any]:
    item_data = getattr(ack, "itemData", None)
    if item_data is None:
        return {
            "status": "error",
            "message": "ReadRangeACK sans itemData",
            "object": obj_str,
            "meta": {"mode": mode},
        }
    try:
        parsed = decode_logbuffer_itemdata(item_data)
        # Vérifier que parsed est une liste avant d'appeler len()
        if not isinstance(parsed, list):
            return {
                "status": "error",
                "message": f"decode_logbuffer_itemdata a retourné un type inattendu: {type(parsed).__name__}",
                "object": obj_str,
                "meta": {"property": 131, "mode": mode},
            }
        return {
            "status": "success",
            "object": obj_str,
            "count": len(parsed),
            "records": parsed,
            "meta": {"property": 131, "mode": mode},
        }
    except Exception as e:
        # Aperçu de debug: type d’itemData et, si possible, 6 premiers “tags”
        preview: List[Dict[str, Any]] = [{"itemData_type": _clsname(item_data), "error": f"{type(e).__name__}: {e}"}]
        try:
            toks = _coerce_itemdata_to_taglist(item_data)
            if toks:
                for i, t in enumerate(list(toks)[:6]):
                    preview.append({"i": i, "tag_type": _clsname(t), "ctx": _get_ctx(t)})
        except Exception:
            pass
        return {
            "status": "error",
            "message": "Echec décodage TrendLog",
            "object": obj_str,
            "preview": preview,
            "meta": {"property": 131, "mode": mode},
        }
