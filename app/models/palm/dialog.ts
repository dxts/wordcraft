/**
 * @license
 *
 * Copyright 2023 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ==============================================================================
 */

import {DialogParams} from '@core/shared/interfaces';
import {DialogModel} from '../dialog_model';
import {callDialogModel, ChatBisonResponse} from './api';
import {createModelResults} from '../utils';

import {ContextService, StatusService} from '@services/services';
import {ModelParams} from '@models/shared';

interface ServiceProvider {
  contextService: ContextService;
  statusService: StatusService;
}
/**
 * A Model representing PaLM Dialog API.
 */
export class PalmDialogModel extends DialogModel {
  constructor(serviceProvider: ServiceProvider) {
    super(serviceProvider);
  }

  override async query(
    dialog: DialogParams,
    params: Partial<ModelParams> = {}
  ) {
    let temperature = (params as any).temperature;
    temperature = temperature === undefined ? 0.7 : temperature;

    const modelParams = {
      ...params,
      candidateCount: 1,
      temperature: temperature,
    };

    const res = await callDialogModel(dialog, modelParams);
    const response: ChatBisonResponse = await res.json();
    console.log('🚀 model results: ', response);

    const responseText = response.predictions?.length
      ? response.predictions.map(
          (prediction) => prediction.candidates[0].content
        )
      : [];

    const results = createModelResults(responseText);
    return results;
  }
}
