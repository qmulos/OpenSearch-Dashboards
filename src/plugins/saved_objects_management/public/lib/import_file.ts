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

import { HttpStart, SavedObjectsImportError } from 'src/core/public';
import { ImportMode } from '../management_section/objects_table/components/import_mode_control';

interface ImportResponse {
  success: boolean;
  successCount: number;
  errors?: SavedObjectsImportError[];
}

export async function importFile(
  http: HttpStart,
  file: File,
  { createNewCopies, overwrite }: ImportMode,
  selectedDataSourceId?: string,
  dataSourceEnabled?: boolean
) {
  const formData = new FormData();
  formData.append('file', file);
  const query = createNewCopies ? { createNewCopies } : { overwrite };
  if (selectedDataSourceId) {
    // @ts-expect-error TS2339 TODO(ts-error): fixme
    query.dataSourceId = selectedDataSourceId;
  }
  if (dataSourceEnabled) {
    // @ts-expect-error TS2339 TODO(ts-error): fixme
    query.dataSourceEnabled = dataSourceEnabled;
  }
  return await http.post<ImportResponse>('/api/saved_objects/_import', {
    body: formData,
    headers: {
      // Important to be undefined, it forces proper headers to be set for FormData
      'Content-Type': undefined,
    },
    query,
  });
}
