import {ContextService, StatusService} from '@core/services/services';
import {ModelResults} from '@core/shared/types';
import {startsWithPunctuation} from '@lib/parse_sentences/utils';
import {Model} from '@models/model';
import {ModelParams} from '@models/shared';
import {
  createModelResults,
  dedupeResults,
  getTextBetweenDelimiters,
  textContainsSpecialCharacters,
} from '@models/utils';

import {
  callChatCompletionsModel,
  CCModelParams,
  ChatCompletionsResponse,
} from './api';

import {makePromptHandler as continuation} from '../prompts/continue';
import {makePromptHandler as elaborate} from '../prompts/elaborate';
import {makePromptHandler as firstSentence} from '../prompts/first_sentence';
import {makePromptHandler as freeform} from '../prompts/freeform';
import {makePromptHandler as generateWithinSentence} from '../prompts/generate_within_sentence';
import {makePromptHandler as metaPrompt} from '../prompts/meta_prompt';
import {makePromptHandler as nextSentence} from '../prompts/next_sentence';
import {makePromptHandler as newStory} from '../prompts/new_story';
import {makePromptHandler as replace} from '../prompts/replace';
import {makePromptHandler as rewriteEndOfSentence} from '../prompts/rewrite_end_of_sentence';
import {makePromptHandler as rewriteSelection} from '../prompts/rewrite_selection';
import {makePromptHandler as rewriteSentence} from '../prompts/rewrite_sentence';
import {makePromptHandler as suggestRewrite} from '../prompts/suggest_rewrite';
import {makePromptHandler as propagateRewrite} from '../prompts/propagate_rewrite';

const BLANK = '____';
const D0 = '{';
const D1 = '}';

interface ServiceProvider {
  contextService: ContextService;
  statusService: StatusService;
}

export class OpenAIModel extends Model {
  constructor(serviceProvider: ServiceProvider) {
    super(serviceProvider);
  }

  override getBlank() {
    return BLANK;
  }

  override wrap(text: string): string {
    return `${D0}${text}${D1}`;
  }

  override getPromptPreamble(): string {
    return 'You are an expert writing assistant, and can expertly write and edit stories.\n\n';
  }

  override getStoryPrefix() {
    return 'Story: ';
  }

  override parseResults(
    results: ModelResults,
    inputPrompt: string = '',
    useDelimiters: boolean = true
  ): ModelResults {
    const parsed = results
      .map((result) => {
        if (inputPrompt) {
          result.text = result.text.replace(inputPrompt, '');
        }
        if (useDelimiters) {
          const text =
            getTextBetweenDelimiters(result.text, D0, D1) || result.text;

          return {...result, text: text};
        } else {
          // First, trim any excess spaces
          let trimmedText = result.text.trim();
          // Then, remove any leading punctuation
          if (startsWithPunctuation(trimmedText)) {
            trimmedText = trimmedText.slice(1);
          }

          return {...result, text: trimmedText};
        }
      })
      .filter((result) => {
        // We want to ensure that text is present, and make sure there
        // aren't any special delimiters present in the text (usually a
        // sign of a bug)
        const textExists = !!result.text;
        const noSpecialCharacters = !textContainsSpecialCharacters(result.text);
        return textExists && noSpecialCharacters;
      });

    return dedupeResults(parsed);
  }

  override async query(
    promptText: string,
    params?: Partial<ModelParams>,
    shouldParse?: boolean
  ): Promise<ModelResults> {
    const modelParams = transformModelParams(params);

    console.log('🚀 prompt text: ', promptText);

    const res = await callChatCompletionsModel(promptText, modelParams);
    const response: ChatCompletionsResponse = await res.json();
    console.log('🚀 model results: ', response);

    const responseText = response.choices?.length
      ? response.choices.map((choice) => choice.message.content)
      : [];

    const results = createModelResults(responseText);
    const output = shouldParse
      ? this.parseResults(results, promptText)
      : results;
    return output;
  }

  override continue = this.makePromptHandler(continuation);
  override elaborate = this.makePromptHandler(elaborate);
  override firstSentence = this.makePromptHandler(firstSentence);
  override freeform = this.makePromptHandler(freeform);
  override generateWithinSentence = this.makePromptHandler(
    generateWithinSentence
  );
  override metaPrompt = this.makePromptHandler(metaPrompt);
  override nextSentence = this.makePromptHandler(nextSentence);
  override newStory = this.makePromptHandler(newStory);
  override replace = this.makePromptHandler(replace);
  override rewriteEndOfSentence = this.makePromptHandler(rewriteEndOfSentence);
  override rewriteSelection = this.makePromptHandler(rewriteSelection);
  override rewriteSentence = this.makePromptHandler(rewriteSentence);
  override suggestRewrite = this.makePromptHandler(suggestRewrite);
  override propagateRewrite = this.makePromptHandler(propagateRewrite);
}

function transformModelParams(
  p: Partial<ModelParams>
): Required<CCModelParams> {
  return {
    max_tokens: p?.maxOutputTokens,
    n: p?.candidateCount,
    temperature: p?.temperature,
    top_p: p?.topP,
    top_k: p?.topK,
    logprobs: p?.logprobs && p?.logprobs > 0 ? true : false,
    top_logprobs: p?.logprobs && p?.logprobs > 0 ? p.logprobs : undefined,
  };
}
