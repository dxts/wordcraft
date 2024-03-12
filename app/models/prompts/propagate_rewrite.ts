import {shuffle} from '@lib/utils';
import {PropagateRewritePromptParams} from '@core/shared/interfaces';
import {PropagateRewriteExample, WordcraftContext} from '../../context';
import {OperationType} from '@core/shared/types';
import {Model} from '..';

export function makePromptHandler(model: Model, context: WordcraftContext) {
  function makePrompt(
    example: Omit<PropagateRewriteExample, 'targetPre' | 'targetPost'>
  ) {
    const {pre, post, rewriteFrom, rewriteTo} = example;

    const textWithBlank = model.insertBlank(pre, post);
    const prefix = model.getStoryPrefix();
    const rewriteFromText = `The phrase in the blank was previously:\n${model.wrap(
      rewriteFrom
    )}`;
    const rewriteToText = `The phrase in the blank has been rewritten to:\n${model.wrap(
      rewriteTo
    )}`;

    const suffix = 'The story adapted to fit the rewrite is: ';

    return `${prefix}\n${model.wrap(
      textWithBlank
    )}\n${rewriteFromText}\n${rewriteToText}\n${suffix}`;
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

      const promptResponse = `${example.targetPre}${example.rewriteTo}${example.targetPost}`;

      promptContext += `${prompt}\n${model.wrap(promptResponse)}\n\n`;
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
