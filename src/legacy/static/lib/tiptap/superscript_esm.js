/**
 * Bundled by jsDelivr using Rollup v4.62.2 and esbuild v0.28.1.
 * Original file: /npm/@tiptap/extension-superscript@3.31.3/dist/index.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
import{Mark as e,mergeAttributes as s}from"/npm/@tiptap/core@3.31.3/+esm";const t=e.create({name:"superscript",addOptions(){return{HTMLAttributes:{}}},parseHTML(){return[{tag:"sup"},{style:"vertical-align",getAttrs(r){return r!=="super"?!1:null}}]},renderHTML({HTMLAttributes:r}){return["sup",s(this.options.HTMLAttributes,r),0]},addCommands(){return{setSuperscript:()=>({commands:r})=>r.setMark(this.name),toggleSuperscript:()=>({commands:r})=>r.toggleMark(this.name),unsetSuperscript:()=>({commands:r})=>r.unsetMark(this.name)}},addKeyboardShortcuts(){return{"Mod-.":()=>this.editor.commands.toggleSuperscript()}}});var u=t;export{t as Superscript,u as default};
//# sourceMappingURL=/sm/02e05f24ebd982cef0abc462091b3f09e4bc3bd24d0166e7fb49a65e838a43c2.map