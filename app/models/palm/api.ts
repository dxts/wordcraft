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

import {DialogMessage, DialogParams} from '@core/shared/interfaces';

export const BLOCK_CONFIDENCE_THRESHOLDS = [
  'BLOCK_CONFIDENCE_THRESHOLD_UNSPECIFIED',
  'BLOCK_LOW_MEDIUM_AND_HIGH_HARM_CONFIDENCE',
  'BLOCK_MEDIUM_AND_HIGH_HARM_CONFIDENCE',
  'BLOCK_HIGH_HARM_CONFIDENCE_ONLY',
  'BLOCK_NONE',
];
export type BlockConfidenceThreshold =
  (typeof BLOCK_CONFIDENCE_THRESHOLDS)[number];

export const SAFETY_CATEGORIES = [
  'HATE',
  'TOXICITY',
  'VIOLENCE',
  'SEXUAL',
  'MEDICAL',
  'DANGEROUS',
];
export type SafetyCategory = (typeof SAFETY_CATEGORIES)[number];

export interface SafetySetting {
  category: number;
  threshold: BlockConfidenceThreshold;
}

export interface ModelParams {
  topK?: number;
  topP?: number;
  candidateCount?: number;
  maxOutputTokens?: number;
  temperature?: number;
  safetySettings?: SafetySetting[];
}

const DEFAULT_PARAMS: ModelParams = {
  temperature: 1,
  topK: 40,
  topP: 0.95,
  candidateCount: 8,
};

const DEFAULT_TEXT_PARAMS: ModelParams = {
  ...DEFAULT_PARAMS,
  maxOutputTokens: 1024,
  safetySettings: SAFETY_CATEGORIES.map((category, index) => ({
    category: index,
    threshold: 'BLOCK_NONE',
  })),
};

const DEFAULT_DIALOG_PARAMS: ModelParams = {
  ...DEFAULT_PARAMS,
};

const PROJECT_ID = 'wordcraft-dhlab';
const LOCATION_ID = 'europe-west3';

const API_URL = `https://europe-west3-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION_ID}/publishers/google`;

const TEXT_MODEL_ID = 'text-bison@001';
const TEXT_METHOD = 'predict';

const DIALOG_MODEL_ID = 'chat-bison@001';
const DIALOG_METHOD = 'predict';

export async function callTextModel(prompt: string, params: ModelParams) {
  params = {
    ...DEFAULT_TEXT_PARAMS,
    ...params,
  };

  const query = {
    instances: [
      {
        prompt: prompt,
      },
    ],
    parameters: params,
  };

  return callApi(TEXT_MODEL_ID, TEXT_METHOD, query);
}

export async function callDialogModel(
  dialog: DialogParams,
  params: ModelParams
) {
  params = {
    ...DEFAULT_DIALOG_PARAMS,
    ...params,
  };

  const query = {
    instances: [dialog],
    parameters: params,
  };

  return callApi(DIALOG_MODEL_ID, DIALOG_METHOD, query);
}

export async function callApi(modelId: string, method: string, query: object) {
  const urlPrefix = `${API_URL}/models/${modelId}:${method}`;
  const url = new URL(urlPrefix);

  return fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VERTEX_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(query),
  });
}

export type TextBisonResponse = {
  predictions: {content: string}[];
};

export type ChatBisonResponse = {
  predictions: {candidates: Array<DialogMessage>}[];
};
