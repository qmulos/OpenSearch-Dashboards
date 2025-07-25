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

import { map, last, cloneDeep } from 'lodash';

import { IndexPattern } from './index_pattern';

import { DuplicateField } from '../../../../opensearch_dashboards_utils/common';
// @ts-expect-error
import mockLogStashFields from '../../../../../fixtures/logstash_fields';
import { stubbedSavedObjectIndexPattern } from '../../../../../fixtures/stubbed_saved_object_index_pattern';
import { IndexPatternField } from '../fields';

import { fieldFormatsMock } from '../../field_formats/mocks';
import { FieldFormat } from '../..';

class MockFieldFormatter {}

fieldFormatsMock.getInstance = jest.fn().mockImplementation(() => new MockFieldFormatter()) as any;

jest.mock('../../field_mapping', () => {
  const originalModule = jest.requireActual('../../field_mapping');

  return {
    ...originalModule,
    expandShorthand: jest.fn(() => ({
      id: true,
      title: true,
      fieldFormatMap: {
        _serialize: jest.fn().mockImplementation(() => {}),
        _deserialize: jest.fn().mockImplementation(() => []),
      },
      fields: {
        _serialize: jest.fn().mockImplementation(() => {}),
        _deserialize: jest.fn().mockImplementation((fields) => fields),
      },
      sourceFilters: {
        _serialize: jest.fn().mockImplementation(() => {}),
        _deserialize: jest.fn().mockImplementation(() => undefined),
      },
      typeMeta: {
        _serialize: jest.fn().mockImplementation(() => {}),
        _deserialize: jest.fn().mockImplementation(() => undefined),
      },
    })),
  };
});

// helper function to create index patterns
function create(id: string) {
  const {
    type,
    version,
    attributes: { timeFieldName, fields, title },
  } = stubbedSavedObjectIndexPattern(id);

  return new IndexPattern({
    spec: { id, type, version, timeFieldName, fields, title },
    savedObjectsClient: {} as any,
    fieldFormats: fieldFormatsMock,
    shortDotsEnable: false,
    metaFields: [],
  });
}

function createWithDataSource(id: string) {
  const {
    type,
    version,
    attributes: { timeFieldName, fields, title },
    reference,
    // @ts-expect-error TS2345 TODO(ts-error): fixme
  } = stubbedSavedObjectIndexPattern(id, true);

  const dataSourceRef = { id: reference[0].id, type: reference[0].type };
  return new IndexPattern({
    spec: { id, type, version, timeFieldName, fields, title, dataSourceRef },
    savedObjectsClient: {} as any,
    fieldFormats: fieldFormatsMock,
    shortDotsEnable: false,
    metaFields: [],
  });
}

describe('IndexPattern', () => {
  let indexPattern: IndexPattern;

  // create an indexPattern instance for each test
  beforeEach(() => {
    indexPattern = create('test-pattern');
  });

  describe('api', () => {
    test('should have expected properties', () => {
      expect(indexPattern).toHaveProperty('getScriptedFields');
      expect(indexPattern).toHaveProperty('getNonScriptedFields');
      expect(indexPattern).toHaveProperty('addScriptedField');
      expect(indexPattern).toHaveProperty('removeScriptedField');

      // properties
      expect(indexPattern).toHaveProperty('fields');
    });
  });

  describe('fields', () => {
    test('should have expected properties on fields', function () {
      expect(indexPattern.fields[0]).toHaveProperty('displayName');
      expect(indexPattern.fields[0]).toHaveProperty('filterable');
      expect(indexPattern.fields[0]).toHaveProperty('sortable');
      expect(indexPattern.fields[0]).toHaveProperty('scripted');
    });
  });

  describe('getScriptedFields', () => {
    test('should return all scripted fields', () => {
      const scriptedNames = mockLogStashFields()
        .filter((item: IndexPatternField) => item.scripted === true)
        .map((item: IndexPatternField) => item.name);
      const respNames = map(indexPattern.getScriptedFields(), 'name');

      expect(respNames).toEqual(scriptedNames);
    });
  });

  describe('getComputedFields', () => {
    test('should be a function', () => {
      expect(indexPattern.getComputedFields).toBeInstanceOf(Function);
    });

    test('should request all stored fields', () => {
      expect(indexPattern.getComputedFields().storedFields).toContain('*');
    });

    test('should request date fields as docvalue_fields', () => {
      const { docvalueFields } = indexPattern.getComputedFields();
      const docValueFieldNames = docvalueFields.map((field) => field.field);

      expect(Object.keys(docValueFieldNames).length).toBe(3);
      expect(docValueFieldNames).toContain('@timestamp');
      expect(docValueFieldNames).toContain('time');
      expect(docValueFieldNames).toContain('utc_time');
    });

    test('should request date field doc values in date_time format', () => {
      const { docvalueFields } = indexPattern.getComputedFields();
      const timestampField = docvalueFields.find((field) => field.field === '@timestamp');

      expect(timestampField).toHaveProperty('format', 'date_time');
    });

    test('should not request scripted date fields as docvalue_fields', () => {
      const { docvalueFields } = indexPattern.getComputedFields();

      expect(docvalueFields).not.toContain('script date');
    });
  });

  describe('getNonScriptedFields', () => {
    test('should return all non-scripted fields', () => {
      const notScriptedNames = mockLogStashFields()
        .filter((item: IndexPatternField) => item.scripted === false)
        .map((item: IndexPatternField) => item.name);
      const respNames = map(indexPattern.getNonScriptedFields(), 'name');

      expect(respNames).toEqual(notScriptedNames);
    });
  });

  describe('add and remove scripted fields', () => {
    test('should append the scripted field', async () => {
      // keep a copy of the current scripted field count
      const oldCount = indexPattern.getScriptedFields().length;

      // add a new scripted field
      const scriptedField = {
        name: 'new scripted field',
        script: 'false',
        type: 'boolean',
      };

      await indexPattern.addScriptedField(
        scriptedField.name,
        scriptedField.script,
        scriptedField.type
      );

      const scriptedFields = indexPattern.getScriptedFields();
      expect(scriptedFields).toHaveLength(oldCount + 1);
      expect((indexPattern.fields.getByName(scriptedField.name) as IndexPatternField).name).toEqual(
        scriptedField.name
      );
    });

    test('should remove scripted field, by name', async () => {
      const scriptedFields = indexPattern.getScriptedFields();
      const oldCount = scriptedFields.length;
      const scriptedField = last(scriptedFields)!;

      await indexPattern.removeScriptedField(scriptedField.name);

      expect(indexPattern.getScriptedFields().length).toEqual(oldCount - 1);
      expect(indexPattern.fields.getByName(scriptedField.name)).toEqual(undefined);
    });

    test('should not allow duplicate names', async () => {
      const scriptedFields = indexPattern.getScriptedFields();
      const scriptedField = last(scriptedFields) as any;
      expect.assertions(1);
      try {
        await indexPattern.addScriptedField(scriptedField.name, "'new script'", 'string');
      } catch (e) {
        expect(e).toBeInstanceOf(DuplicateField);
      }
    });
  });

  describe('toSpec', () => {
    test('should match snapshot', () => {
      const formatter = {
        toJSON: () => ({ id: 'number', params: { pattern: '$0,0.[00]' } }),
      } as FieldFormat;
      indexPattern.getFormatterForField = () => formatter;
      expect(indexPattern.toSpec()).toMatchSnapshot();
    });

    test('can restore from spec', () => {
      const formatter = {
        toJSON: () => ({ id: 'number', params: { pattern: '$0,0.[00]' } }),
      } as FieldFormat;
      indexPattern.getFormatterForField = () => formatter;
      const spec = indexPattern.toSpec();
      const restoredPattern = new IndexPattern({
        spec,
        savedObjectsClient: {} as any,
        fieldFormats: fieldFormatsMock,
        shortDotsEnable: false,
        metaFields: [],
      });
      expect(restoredPattern.id).toEqual(indexPattern.id);
      expect(restoredPattern.title).toEqual(indexPattern.title);
      expect(restoredPattern.timeFieldName).toEqual(indexPattern.timeFieldName);
      expect(restoredPattern.fields.length).toEqual(indexPattern.fields.length);
      expect(restoredPattern.fieldFormatMap.bytes instanceof MockFieldFormatter).toEqual(true);
    });
  });
});

describe('IndexPatternWithDataSource', () => {
  let indexPattern: IndexPattern;

  // create an indexPattern instance for each test
  beforeEach(() => {
    indexPattern = createWithDataSource('test-pattern');
  });

  describe('toSpec', () => {
    test('should match snapshot', () => {
      const formatter = {
        toJSON: () => ({ id: 'number', params: { pattern: '$0,0.[00]' } }),
      } as FieldFormat;
      indexPattern.getFormatterForField = () => formatter;
      expect(indexPattern.toSpec()).toMatchSnapshot();
    });

    test('can restore from spec', () => {
      const formatter = {
        toJSON: () => ({ id: 'number', params: { pattern: '$0,0.[00]' } }),
      } as FieldFormat;
      indexPattern.getFormatterForField = () => formatter;
      const spec = indexPattern.toSpec();
      const restoredPattern = new IndexPattern({
        spec,
        savedObjectsClient: {} as any,
        fieldFormats: fieldFormatsMock,
        shortDotsEnable: false,
        metaFields: [],
      });
      expect(restoredPattern.id).toEqual(indexPattern.id);
      expect(restoredPattern.title).toEqual(indexPattern.title);
      expect(restoredPattern.timeFieldName).toEqual(indexPattern.timeFieldName);
      expect(restoredPattern.fields.length).toEqual(indexPattern.fields.length);
      expect(restoredPattern.fieldFormatMap.bytes instanceof MockFieldFormatter).toEqual(true);
      expect(restoredPattern.dataSourceRef).toEqual(indexPattern.dataSourceRef);
    });
  });

  describe('getSaveObjectReference', () => {
    test('should get index pattern saved object reference', function () {
      expect(indexPattern.getSaveObjectReference()[0]?.id).toEqual(indexPattern.dataSourceRef?.id);
      expect(indexPattern.getSaveObjectReference()[0]?.type).toEqual(
        indexPattern.dataSourceRef?.type
      );
      expect(indexPattern.getSaveObjectReference()[0]?.name).toEqual('dataSource');
    });
  });

  describe('flattenHit', () => {
    test('should not modify original hit', () => {
      const nestedArrayIndexPattern = new IndexPattern({
        spec: {
          id: 'test-nested-array',
          type: 'index-pattern',
          fields: {
            'nested_test1.d_values': {
              count: 0,
              name: 'nested_test1.d_values',
              type: 'number',
              esTypes: ['double'],
              scripted: false,
              searchable: true,
              aggregatable: true,
              readFromDocValues: true,
              subType: {
                nested: {
                  path: 'nested_test1',
                },
              },
            },
            'nested_test1.s_entry': {
              count: 0,
              name: 'nested_test1.s_entry',
              type: 'string',
              esTypes: ['keyword'],
              scripted: false,
              searchable: true,
              aggregatable: true,
              readFromDocValues: true,
              subType: {
                nested: {
                  path: 'nested_test1',
                },
              },
            },
          },
        },
        savedObjectsClient: {} as any,
        fieldFormats: fieldFormatsMock,
        shortDotsEnable: false,
        metaFields: [],
      });

      const hit = {
        _index: 'test-nested-array',
        _id: 'JPas2pQBluzwIEYCwD0y',
        _score: 1,
        _source: {
          nested_test1: [
            {
              d_values: [0.1, 0.2],
              s_entry: '4',
            },
            {
              d_values: [0.3, 0.4],
              s_entry: '5',
            },
            {
              d_values: [0.5, 0.6],
              s_entry: '6',
            },
          ],
        },
      };
      const hitClone = cloneDeep(hit);
      nestedArrayIndexPattern.flattenHit(hit);

      expect(hit).toEqual(hitClone);
    });
  });
});
