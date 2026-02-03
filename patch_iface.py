import pathlib
from textwrap import dedent
path = pathlib.Path('components/NetworkManager.tsx')
txt = path.read_text(encoding='utf-8')
start = txt.find('{/* Mode Selection */}')
end = txt.find('                    <button', start)
if start == -1 or end == -1:
    raise SystemExit('block not found')
new_block = dedent('''
                    {/* Interface + Port */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {language === 'fr' ? 'Interface réseau (IP locale)' : 'Network Interface (local IP)'}
                            </label>
                            {interfacesList.length > 0 ? (
                                <select
                                    value={config.bacnet.interfaceIp || ''}
                                    onChange={(e) => handleConfigChange('bacnet', 'interfaceIp', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                                >
                                    {interfacesList.map((iface) => (
                                        <option key={iface.ip} value={iface.ip}>
                                            {iface.name} - {iface.ip}
                                        </option>
                                    ))}
                                    <option value="">(Custom)</option>
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={config.bacnet.interfaceIp || ''}
                                    onChange={(e) => handleConfigChange('bacnet', 'interfaceIp', e.target.value)}
                                    placeholder="192.168.1.10"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                                />
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {language === 'fr' ? 'Port BACnet' : 'BACnet Port'}
                            </label>
                            <input
                                type="number"
                                value={config.bacnet.port || 0}
                                onChange={(e) => handleConfigChange('bacnet', 'port', parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
''')
path.write_text(txt[:start] + new_block + txt[end:], encoding='utf-8')
print('patched')
