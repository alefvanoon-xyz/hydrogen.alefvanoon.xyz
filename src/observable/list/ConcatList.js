import BaseObservableList from "./BaseObservableList.js";

export default class ConcatList extends BaseObservableList {
    constructor(...sourceLists) {
        super();
        this._sourceLists = sourceLists;
        this._sourceUnsubscribes = null;
    }

    _offsetForSource(sourceList) {
        const listIdx = this._sourceLists.indexOf(sourceList);
        let offset = 0;
        for (let i = 0; i < listIdx; ++i) {
            offset += this._sourceLists[i].length;
        }
        return offset;
    }

    onSubscribeFirst() {
        this._sourceUnsubscribes = [];
        for (const sourceList of this._sourceLists) {
            this._sourceUnsubscribes.push(sourceList.subscribe(this));
        }
    }

    onUnsubscribeLast() {
        for (const sourceUnsubscribe of this._sourceUnsubscribes) {
            sourceUnsubscribe();
        }
    }

    onReset() {
        // TODO: not ideal if other source lists are large
        // but working impl for now
        // reset, and 
        this.emitReset();
        let idx = 0;
        for(const item of this) {
            this.emitAdd(idx, item);
            idx += 1;
        }
    }

    onAdd(index, value, sourceList) {
        this.emitAdd(this._offsetForSource(sourceList) + index, value);
    }

    onUpdate(index, value, params, sourceList) {
        this.emitAdd(this._offsetForSource(sourceList) + index, value, params);
    }

    onRemove(index, value, sourceList) {
        this.emitRemove(this._offsetForSource(sourceList) + index, value);
    }

    onMove(fromIdx, toIdx, value, sourceList) {
        const offset = this._offsetForSource(sourceList);
        this.emitMove(offset + fromIdx, offset + toIdx, value);
    }

    get length() {
        let len = 0;
        for (let i = 0; i < this._sourceLists.length; ++i) {
            len += this._sourceLists[i].length;
        }
        return len;
    }

    [Symbol.iterator]() {
        let sourceListIdx = 0;
        let it = this._sourceLists[0][Symbol.iterator]();
        return {
            next: () => {
                let result = it.next();
                while (result.done) {
                    sourceListIdx += 1;
                    if (sourceListIdx >= this._sourceLists.length) {
                        return result;  //done
                    }
                    it = this._sourceLists[sourceListIdx][Symbol.iterator]();
                    result = it.next();
                }
                return result;
            }
        }
    }
}

import ObservableArray from "./ObservableArray.js";
export async function tests() {
    return {
        test_length(assert) {
            const all = new ConcatList(
                new ObservableArray([1, 2, 3]),
                new ObservableArray([11, 12, 13])
            );
            assert.equal(all.length, 6);
        },
        test_iterator(assert) {
            const all = new ConcatList(
                new ObservableArray([1, 2, 3]),
                new ObservableArray([11, 12, 13])
            );
            const it = all[Symbol.iterator]();
            assert.equal(it.next().value, 1);
            assert.equal(it.next().value, 2);
            assert.equal(it.next().value, 3);
            assert.equal(it.next().value, 11);
            assert.equal(it.next().value, 12);
            assert.equal(it.next().value, 13);
            assert(it.next().done);
        },
        test_add(assert) {
            const list1 = new ObservableArray([1, 2, 3]);
            const list2 = new ObservableArray([11, 12, 13]);
            const all = new ConcatList(list1, list2);
            let fired = false;
            all.subscribe({
                onAdd(index, value) {
                    fired = true;
                    assert.equal(index, 4);
                    assert.equal(value, 11.5);
                }
            });
            list2.insert(1, 11.5);
            assert(fired);
        },
        test_update(assert) {
            const list1 = new ObservableArray([1, 2, 3]);
            const list2 = new ObservableArray([11, 12, 13]);
            const all = new ConcatList(list1, list2);
            let fired = false;
            all.subscribe({
                onUpdate(index, value) {
                    fired = true;
                    assert.equal(index, 4);
                    assert.equal(value, 10);
                }
            });
            list2.emitUpdate(1, 10);
            assert(fired);
        },
    };
}
