import {shuffle} from '@lib/utils';
import {PropagateRewritePromptParams} from '@core/shared/interfaces';
import {PropagateRewriteExample, WordcraftContext} from '../../../context';
import {ModelResults, OperationType} from '@core/shared/types';
import {PalmModel} from '..';

export function makePromptHandler(model: PalmModel, context: WordcraftContext) {
  function makePrompt(
    example: Omit<PropagateRewriteExample, 'targetPre' | 'targetPost'>
  ) {
    const {pre, post, rewriteFrom, rewriteTo} = example;

    const textWithBlank = model.insertBlank(pre, post);
    const prefix = model.getStoryPrefix();
    const rewrittenPiece = `The blank was rewritten from: "${rewriteFrom}" to: "${rewriteTo}"`;
    const suffix = 'The story adapted to fit the rewrite is: ';

    return `${prefix} ${model.wrap(
      textWithBlank
    )}\n${rewrittenPiece}\n${suffix} `;
  }

  function makePromptContext() {
    const examples = context.getExampleData<PropagateRewriteExample>(
      OperationType.PROPAGATE_REWRITE
    );

    const shuffled = shuffle(examples);
    let promptContext = model.getPromptPreamble();
    for (let i = 0; i < shuffled.length; i++) {
      const example = shuffled[i];
      const prompt = makePrompt(example);

      const promptResponse = `${example.pre}${example.rewriteTo}${example.post}`;

      promptContext += `${prompt} \n${model.wrap(promptResponse)}\n\n`;
    }

    return promptContext;
  }

  return async function rewriteSelection(params: PropagateRewritePromptParams) {
    console.log('propagate rewrite prompt');
    const {pre, post, rewriteFrom, rewriteTo} = params;
    const promptContext = makePromptContext();
    const prompt = makePrompt({
      pre,
      post,
      rewriteFrom,
      rewriteTo,
    });

    const inputText = promptContext + prompt;
    return model.query(inputText);
  };
}
