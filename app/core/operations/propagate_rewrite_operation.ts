import {computed, decorate} from 'mobx';
import {diffWords, diffWordsWithSpace} from 'diff';
import {createModelResult} from '@models/utils';
import * as helpers from '../operation_data/helpers';
import {
  ModelResult,
  OperationSite,
  OperationTrigger,
  OperationType,
  TextType,
} from '../shared/types';

import {ChoiceOperation} from './choice_operation';
import {ServiceProvider} from './operation';
import {TextInputControl} from './operation_controls';
import {ControlsStep} from './steps';

/**
 * An operation that rewrites the selected word/phrase.
 */
export class PropagateRewriteOperation extends ChoiceOperation {
  static override isAvailable(operationSite: OperationSite) {
    return operationSite === OperationSite.SELECTION;
  }

  constructor(
    serviceProvider: ServiceProvider,
    trigger: OperationTrigger,
    rewriteTo: string = ''
  ) {
    super(serviceProvider, trigger);
    if (rewriteTo) {
      this.instantiatedWithRewriteTo = true;
      this.instanceControls.rewriteTo.value = rewriteTo;
    }
  }

  static override id = OperationType.PROPAGATE_REWRITE;

  private readonly instantiatedWithRewriteTo: boolean = false;

  static override getDescription() {
    return 'Adapt the story to include the rewritten section.';
  }

  static override getButtonLabel() {
    return 'adapt story';
  }

  get rewriteTo(): string {
    return this.instantiatedWithRewriteTo
      ? this.instanceControls.rewriteTo.value
      : PropagateRewriteOperation.controls.rewriteTo.value;
  }

  getLoadingMessage() {
    return `Rewriting story...`;
  }

  override async beforeStart() {
    // If the operation was instantiated with a prompt, then there's no need to
    // move into the text input step;
    if (this.instantiatedWithRewriteTo) {
      return;
    }

    // Only if the operation was triggered by key command do we move into the
    // controls step to get the prompt from a user input.
    if (this.trigger !== OperationTrigger.KEY_COMMAND) return;

    const controlsStep = new ControlsStep(
      this.serviceProvider,
      PropagateRewriteOperation.controls,
      'Rewrite section to adapt the story'
    );
    this.setCurrentStep(controlsStep);
    return controlsStep.getPromise();
  }

  getCompleteText() {
    // get the original text from the document
    const documentPlainText = this.textEditorService.getPlainText();
    // escape the original text to convert whitespace to escape sequences
    const escapedText = JSON.stringify(documentPlainText).slice(1, -1);

    return escapedText;
  }

  async run() {
    const operationData = this.getOperationData();
    const selectedText = helpers.getSelectedText(operationData);

    const selectionRange = this.textEditorService.getRange();
    const insertPosition = this.textEditorService.deleteRange(selectionRange);
    this.textEditorService.insertSelectionAtom(insertPosition, selectedText);

    const controls = {rewriteTo: this.rewriteTo};
    const params = this.dataProcessor.propagateRewrite(operationData, controls);
    const results = await this.getModel().propagateRewrite(params);

    // Keep the original text as the first option.
    const originalChoice = createModelResult(helpers.getAllText(operationData));
    this.setChoices(results, originalChoice);
  }

  onPendingChoice(choice: ModelResult) {
    // do a diff of the original text and the new text
    const originalText = helpers.getAllText(this.getOperationData());

    const diff = diffWordsWithSpace(originalText, choice.text);

    // delete the original text from the document
    let position = this.textEditorService.deleteDocument();

    // add deletionAtoms and choiceAtoms to the textEditorService to show the diff
    for (const part of diff) {
      if (part.added) {
        position = this.textEditorService.insertAdditionAtom(
          part.value,
          position
        );
      } else if (part.removed) {
        position = this.textEditorService.insertDeletionAtom(
          part.value,
          position
        );
      } else {
        position = this.textEditorService.insertGeneratedText(
          part.value,
          position
        );
      }
    }
  }

  onSelectChoice(choice: ModelResult) {
    const startPosition = this.textEditorService.deleteDocument();

    this.textEditorService.insertGeneratedText(choice.text, startPosition);
  }

  override instanceControls = {
    rewriteTo: new TextInputControl({
      prefix: 'rewrite selection to',
      description: 'New text to replace the selection',
      value: PropagateRewriteOperation.controls.rewriteTo.value,
    }),
  };

  static override controls = {
    rewriteTo: new TextInputControl({
      prefix: 'rewrite selection to',
      description: 'New text to replace the selection',
      value: '',
    }),
  };
}

decorate(PropagateRewriteOperation, {
  rewriteTo: computed,
});
