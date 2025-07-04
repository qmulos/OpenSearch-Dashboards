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

import d3 from 'd3';
import $ from 'jquery';

export interface Emitter {
  on: (...args: any[]) => void;
  off: (...args: any[]) => void;
  addListener: Emitter['on'];
  removeListener: Emitter['off'];
}

export class Binder {
  private disposal: Array<() => void> = [];

  public on(emitter: Emitter, ...args: any[]) {
    const on = emitter.on || emitter.addListener;
    const off = emitter.off || emitter.removeListener;

    on.apply(emitter, args);
    this.disposal.push(() => off.apply(emitter, args));
  }

  public destroy() {
    const destroyers = this.disposal;
    this.disposal = [];
    destroyers.forEach((fn) => fn());
  }

  jqOn(el: HTMLElement, ...args: [string, (event: JQueryEventObject) => void]) {
    const $el = $(el);
    $el.on(...args);
    // @ts-expect-error TS2769 TODO(ts-error): fixme
    this.disposal.push(() => $el.off(...args));
  }

  fakeD3Bind(el: HTMLElement, event: string, handler: (event: JQueryEventObject) => void) {
    this.jqOn(el, event, (e: JQueryEventObject) => {
      // mimic https://github.com/mbostock/d3/blob/3abb00113662463e5c19eb87cd33f6d0ddc23bc0/src/selection/on.js#L87-L94
      const o = d3.event; // Events can be reentrant (e.g., focus).
      d3.event = e;
      try {
        // @ts-ignore
        handler.apply(this, [this.__data__]);
      } finally {
        d3.event = o;
      }
    });
  }
}
