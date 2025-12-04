import { MathExtension } from '@aarkue/tiptap-math-extension';
import { Extension } from '@tiptap/core';
import type { KatexOptions } from 'katex';

export const sharedKatexOptions: KatexOptions = {
  throwOnError: false,
  strict: 'ignore',
  output: 'html',
};

export const MathExtensionConfigured = MathExtension.configure({
  evaluation: false,
  delimiters: 'dollar', // Enables $...$ for inline math
  katexOptions: sharedKatexOptions,
});

// Add selection-to-math command
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathSelectionCommands: {
      selectionToInlineMath: () => ReturnType;
    };
  }
}

export const MathSelectionCommands = Extension.create({
  name: 'mathSelectionCommands',

  addCommands() {
    return {
      selectionToInlineMath:
        () =>
        ({ tr, state, dispatch }) => {
          const { from, to, empty } = state.selection;
          if (empty || !dispatch) return false;

          const text = state.doc.textBetween(from, to, '');
          const mathNode = state.schema.nodes['math_inline']?.create({ latex: text });

          if (!mathNode) return false;

          tr.replaceWith(from, to, mathNode);
          dispatch(tr);
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-m': () => this.editor.commands.selectionToInlineMath(),
    };
  },
});
