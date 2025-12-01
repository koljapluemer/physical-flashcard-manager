import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    box: {
      insertBox: () => ReturnType;
      toggleBox: () => ReturnType;
    };
  }
}

export const Box = Node.create({
  name: 'box',
  group: 'block',
  content: 'block+',
  defining: true,

  parseHTML() {
    return [{ tag: 'aside' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['aside', mergeAttributes({ class: 'flashcard-box' }, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      toggleBox:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
      insertBox:
        () =>
        ({ chain }) =>
          chain()
            .focus()
            .insertContent({
              type: this.name,
              content: [{ type: 'paragraph' }],
            })
            .run(),
    };
  },
});
