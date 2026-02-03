import LogsPanel from "./LogsPanel-myx3jrpV.js";
import { d as defineComponent, a9 as useWorkflowsStore, x as computed, e as createBlock, f as createCommentVNode, g as openBlock } from "./index-CRQJ7x6N.js";
import "./AnimatedSpinner-BGiYi74y.js";
import "./ConsumedTokensDetails.vue_vue_type_script_setup_true_lang-DqYON-Vj.js";
import "./core-VLDylmke.js";
import "./canvas-DFP0pMz9.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "DemoFooter",
  setup(__props) {
    const workflowsStore = useWorkflowsStore();
    const hasExecutionData = computed(() => workflowsStore.workflowExecutionData);
    return (_ctx, _cache) => {
      return hasExecutionData.value ? (openBlock(), createBlock(LogsPanel, {
        key: 0,
        "is-read-only": true
      })) : createCommentVNode("", true);
    };
  }
});
export {
  _sfc_main as default
};
