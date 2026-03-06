// Copyright (C) 2025 Langning Chen
// 
// This file is part of miniapp.
// 
// miniapp is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// miniapp is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with miniapp.  If not, see <https://www.gnu.org/licenses/>.

import { TextData } from "./textBuffer";
import { POS } from "./cursor";

export type HistoryData = {
    data: TextData;
    pos: POS;
}

export default class History {
    undoStack: HistoryData[];
    redoStack: HistoryData[];
    maxHistory: number = 100;

    constructor(data: TextData, pos: POS) {
        this.undoStack = [{ data: { ...data }, pos: { ...pos } }];
        this.redoStack = [];
    }

    saveState(textData: TextData, pos: POS) {
        this.redoStack = [];
        const state = {
            data: textData.map(line => line),
            pos: { ...pos },
        };
        if (this.undoStack.length > 0) {
            const lastState = this.undoStack[this.undoStack.length - 1];
            if (lastState.data.length === state.data.length &&
                lastState.data.every((line, i) => line === state.data[i]) &&
                lastState.pos === state.pos) {
                return;
            }
        }
        this.undoStack.push(state);
        if (this.undoStack.length > this.maxHistory) { this.undoStack.shift(); }
    }

    undo() {
        if (this.undoStack.length <= 1) { return null; }
        this.redoStack.push(this.undoStack.pop()!);
        return this.undoStack[this.undoStack.length - 1];
    }

    redo() {
        if (this.redoStack.length === 0) { return null; }
        this.undoStack.push(this.redoStack.pop()!);
        return this.undoStack[this.undoStack.length - 1];
    }
}
