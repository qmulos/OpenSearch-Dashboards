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

import { first } from 'rxjs/operators';
import { SharedGlobalConfig, Logger, OpenSearchServiceSetup } from 'opensearch-dashboards/server';
import { SearchResponse } from 'elasticsearch';
import { Observable } from 'rxjs';
import { ApiResponse } from '@opensearch-project/opensearch';
import { DataSourcePluginSetup } from 'src/plugins/data_source/server';
import { SearchUsage } from '../collectors/usage';
import { toSnakeCase } from './to_snake_case';
import {
  ISearchStrategy,
  getDefaultSearchParams,
  getTotalLoaded,
  getShardTimeout,
  shimAbortSignal,
} from '..';
import { decideClient } from '../../../../data_source/common/util/';

export const opensearchSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage,
  dataSource?: DataSourcePluginSetup,
  openSearchServiceSetup?: OpenSearchServiceSetup,
  withLongNumeralsSupport?: boolean
): ISearchStrategy => {
  return {
    search: async (context, request, options) => {
      const config = await config$.pipe(first()).toPromise();
      const uiSettingsClient = await context.core.uiSettings.client;

      // Only default index pattern type is supported here.
      // See data_enhanced for other type support.
      if (!!request.indexType) {
        throw new Error(`Unsupported index pattern type ${request.indexType}`);
      }

      // ignoreThrottled & dataFrameHydrationStrategy is not supported by default
      const {
        ignoreThrottled,
        dataFrameHydrationStrategy,
        ...defaultParams
      } = await getDefaultSearchParams(uiSettingsClient);

      const params = toSnakeCase({
        ...defaultParams,
        ...getShardTimeout(config),
        ...request.params,
      });

      try {
        const isOpenSearchHostsEmpty =
          // @ts-expect-error TS2339 TODO(ts-error): fixme
          openSearchServiceSetup?.legacy?.client?.config?.hosts?.length === 0;

        if (dataSource?.dataSourceEnabled() && isOpenSearchHostsEmpty && !request.dataSourceId) {
          throw new Error(`Data source id is required when no openseach hosts config provided`);
        }

        const client = await decideClient(context, request, withLongNumeralsSupport);
        const promise = shimAbortSignal(client.search(params), options?.abortSignal);

        const { body: rawResponse } = (await promise) as ApiResponse<SearchResponse<any>>;

        if (usage) usage.trackSuccess(rawResponse.took);

        // The above query will either complete or timeout and throw an error.
        // There is no progress indication on this api.
        return {
          isPartial: false,
          isRunning: false,
          rawResponse,
          ...getTotalLoaded(rawResponse._shards),
          withLongNumeralsSupport,
        };
      } catch (e) {
        if (usage) usage.trackError();

        if (dataSource?.dataSourceEnabled()) {
          throw dataSource.createDataSourceError(e);
        }
        throw e;
      }
    },
  };
};
