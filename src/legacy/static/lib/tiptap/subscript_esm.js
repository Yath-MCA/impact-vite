/**
 * Bundled by jsDelivr using Rollup v4.62.2 and esbuild v0.28.1.
 * Original file: /npm/@tiptap/extension-subscript@3.31.3/dist/index.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
import{Mark as e,mergeAttributes as s}from"/npm/@tiptap/core@3.31.3/+esm";const r=e.create({name:"subscript",addOptions(){return{HTMLAttributes:{}}},parseHTML(){return[{tag:"sub"},{style:"vertical-align",getAttrs(t){return t!=="sub"?!1:null}}]},renderHTML({HTMLAttributes:t}){return["sub",s(this.options.HTMLAttributes,t),0]},addCommands(){return{setSubscript:()=>({commands:t})=>t.setMark(this.name),toggleSubscript:()=>({commands:t})=>t.toggleMark(this.name),unsetSubscript:()=>({commands:t})=>t.unsetMark(this.name)}},addKeyboardShortcuts(){return{"Mod-,":()=>this.editor.commands.toggleSubscript()}}});var u=r;export{r as Subscript,u as default};
//# sourceMappingURL=/sm/cdfc5f3ffdb683f868443f4af4f9cf543042b9063a662857260a5cae87334ee3.map