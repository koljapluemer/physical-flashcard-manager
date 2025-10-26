import { Node, mergeAttributes, type Command } from '@tiptap/core';
import katex from 'katex';

function renderExpression(expression: string, displayMode: boolean) {
  try {
    return katex.renderToString(expression, {
      throwOnError: false,
      displayMode,
    });
  } catch (error) {
    console.warn('Failed to render KaTeX expression', error);
    return expression;
  }
}

export const MathInline = Node.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      expression: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-math-inline]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const expression = HTMLAttributes.expression || '';
    const rendered = renderExpression(expression, false);
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-math-inline': 'true',
        'data-expression': expression,
        class: 'math-inline',
      }),
      rendered,
    ];
  },

  renderText({ node }) {
    return `$${node.attrs.expression ?? ''}$`;
  },

  addCommands() {
    return {
      setMathInline:
        (expression: string): Command =>
        ({ state, dispatch }) => {
          const { from, to } = state.selection;
          if (dispatch) {
            const transaction = state.tr.replaceRangeWith(from, to, this.type.create({ expression }));
            dispatch(transaction);
          }
          return true;
        },
    };
  },
});

export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      expression: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-math-block]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const expression = HTMLAttributes.expression || '';
    const rendered = renderExpression(expression, true);
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-math-block': 'true',
        'data-expression': expression,
        class: 'math-block',
      }),
      rendered,
    ];
  },

  renderText({ node }) {
    return `$$${node.attrs.expression ?? ''}$$`;
  },

  addCommands() {
    return {
      setMathBlock:
        (expression: string): Command =>
        ({ state, dispatch }) => {
          const { from, to } = state.selection;
          if (dispatch) {
            const transaction = state.tr.replaceRangeWith(from, to, this.type.create({ expression }));
            dispatch(transaction.scrollIntoView());
          }
          return true;
        },
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathInline: {
      setMathInline: (expression: string) => ReturnType;
    };
    mathBlock: {
      setMathBlock: (expression: string) => ReturnType;
    };
  }
}
