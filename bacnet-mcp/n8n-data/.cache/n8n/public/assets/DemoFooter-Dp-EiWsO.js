import LogsPanel from "./LogsPanel-lijAjBs3.js";
import { d as defineComponent, a5 as useWorkflowsStore, x as computed, e as createBlock, f as createCommentVNode, g as openBlock } from "./index-DJu2gb_4.js";
import "./AnimatedSpinner-D3ljAc96.js";
import "./ConsumedTokensDetails.vue_vue_type_script_setup_true_lang-BNkO3XxQ.js";
import "./VueMarkdown-BXoAxQ2V.js";
import "./canvas-BAegJxph.js";
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
