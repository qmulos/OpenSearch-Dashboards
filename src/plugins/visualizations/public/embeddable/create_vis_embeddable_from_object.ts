/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Vis } from '../types';
import {
  VisualizeInput,
  VisualizeEmbeddable,
  VisualizeByValueInput,
  VisualizeByReferenceInput,
  VisualizeSavedObjectAttributes,
} from './visualize_embeddable';
import { IContainer, ErrorEmbeddable } from '../../../embeddable/public';
import { DisabledLabEmbeddable } from './disabled_lab_embeddable';
import {
  getSavedVisualizationsLoader,
  getUISettings,
  getHttp,
  getTimeFilter,
  getCapabilities,
  getSavedAugmentVisLoader,
} from '../services';
import { VisualizeEmbeddableFactoryDeps } from './visualize_embeddable_factory';
import { VISUALIZE_ENABLE_LABS_SETTING } from '../../common/constants';
import { SavedVisualizationsLoader } from '../saved_visualizations';
import { AttributeService } from '../../../dashboard/public';
import { IndexPattern } from '../../../data/public';

export const createVisEmbeddableFromObject = (deps: VisualizeEmbeddableFactoryDeps) => async (
  vis: Vis,
  input: Partial<VisualizeInput> & { id: string },
  savedVisualizationsLoader?: SavedVisualizationsLoader,
  attributeService?: AttributeService<
    VisualizeSavedObjectAttributes,
    VisualizeByValueInput,
    VisualizeByReferenceInput
  >,
  parent?: IContainer
): Promise<VisualizeEmbeddable | ErrorEmbeddable | DisabledLabEmbeddable> => {
  const savedVisualizations = getSavedVisualizationsLoader();

  try {
    const visId = vis.id as string;

    const editPath = visId ? savedVisualizations.urlFor(visId) : '#/edit_by_value';

    const editUrl = visId
      ? getHttp().basePath.prepend(`/app/visualize${savedVisualizations.urlFor(visId)}`)
      : '';
    const isLabsEnabled = getUISettings().get<boolean>(VISUALIZE_ENABLE_LABS_SETTING);

    if (!isLabsEnabled && vis.type.stage === 'experimental') {
      return new DisabledLabEmbeddable(vis.title, input);
    }

    let indexPatterns: IndexPattern[] = [];

    if (vis.type.getUsedIndexPattern) {
      indexPatterns = await vis.type.getUsedIndexPattern(vis.params);
    } else if (vis.data.indexPattern) {
      indexPatterns = [vis.data.indexPattern];
    }

    // @ts-expect-error TS2532 TODO(ts-error): fixme
    const editable = getCapabilities().visualize.save as boolean;

    const savedAugmentVisLoader = getSavedAugmentVisLoader();

    return new VisualizeEmbeddable(
      getTimeFilter(),
      {
        vis,
        indexPatterns,
        editPath,
        editUrl,
        editable,
        deps,
      },
      input,
      attributeService,
      savedVisualizationsLoader,
      savedAugmentVisLoader,
      parent
    );
  } catch (e) {
    console.error(e); // eslint-disable-line no-console
    return new ErrorEmbeddable(e, input, parent);
  }
};
