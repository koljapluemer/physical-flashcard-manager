import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import Mathematics from '@tiptap/extension-mathematics';
import type { KatexOptions } from 'katex';

export type MathNodeClickHandler = (node: ProseMirrorNode, pos: number) => void;

interface CreateMathExtensionOptions {
  onInlineClick?: MathNodeClickHandler;
  onBlockClick?: MathNodeClickHandler;
  katexOptions?: KatexOptions;
}

export const sharedKatexOptions: KatexOptions = {
  throwOnError: false,
  strict: 'ignore',
  output: 'html',
};

export function createMathExtension(options: CreateMathExtensionOptions = {}) {
  return Mathematics.configure({
    katexOptions: options.katexOptions ?? sharedKatexOptions,
    inlineOptions: options.onInlineClick
      ? {
          onClick: options.onInlineClick,
        }
      : undefined,
    blockOptions: options.onBlockClick
      ? {
          onClick: options.onBlockClick,
        }
      : undefined,
  });
}
