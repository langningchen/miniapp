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

import { IME, ScanInput } from 'langningchen';
import Editor from '../../editor/editor';
import { defineComponent } from 'vue';
import { Candidate, Pinyin } from '../../@types/langningchen';
import { getCharWidth, getPositionWidth } from '../../utils/charUtils';
import { hideLoading, showLoading } from '../../components/Loading';

export type SoftKeyboardOption = {
    data: string;
};

const maxColumns = 70;
const maxLines = 10;

const softKeyboard = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<SoftKeyboardOption>,
            editor: null as Editor | null,
            isChineseMode: false,
            currentPinyin: '',
            candidates: [] as Candidate[],
            visibleCandidates: [] as Candidate[],
            candidatePageIndex: 0,
            selectedCandidateIndex: 0,
            keyPopup: {
                visible: false,
                displayText: '',
                style: {} as Record<string, any>
            },
            popupTimer: null as ReturnType<typeof setTimeout> | null,
            pinyinHistory: [] as Pinyin,
            hanZiHistory: '' as string,
        };
    },
    mounted() {
        this.editor = new Editor(maxColumns, maxLines);
        this.editor.handleInput(this.$page.loadOptions.data);
        this.$page.$npage.setSupportBack(false);
        this.$page.$npage.on("backpressed", () => { this.close(); });
    },
    unmount() {
        ScanInput.deinitialize();
    },
    computed: {
        allChars() {
            if (!this.editor) return [];

            const chars: any[] = [];
            const { row, col } = this.editor.cursor.pos;
            const baseCharWidth = 8;
            const lineHeight = 16;

            const selectionRange = this.editor.selection.getNormalizedRange();
            const visibleLines = this.editor.getVisibleLines();

            visibleLines.forEach(lineInfo => {
                const { logicalRow, startCharIndex, displayRow, line } = lineInfo;
                const scrollOffsetWidth = getPositionWidth(line, startCharIndex, baseCharWidth);

                const maxVisibleWidth = this.editor!.maxColumns * baseCharWidth;

                let currentWidth = 0;
                let charIndex = startCharIndex;

                while (charIndex < line.length && currentWidth < maxVisibleWidth) {
                    const char = line[charIndex];
                    const charWidth = getCharWidth(char, baseCharWidth);

                    if (currentWidth + charWidth > maxVisibleWidth) {
                        break;
                    }

                    const isCursor = (logicalRow === row && charIndex === col);
                    let isSelected = false;

                    if (selectionRange) {
                        const { start, end } = selectionRange;
                        if (logicalRow > start.row && logicalRow < end.row) {
                            isSelected = true;
                        } else if (logicalRow === start.row && logicalRow === end.row) {
                            isSelected = charIndex >= start.col && charIndex < end.col;
                        } else if (logicalRow === start.row) {
                            isSelected = charIndex >= start.col;
                        } else if (logicalRow === end.row) {
                            isSelected = charIndex < end.col;
                        }
                    }

                    chars.push({
                        id: `char-${logicalRow}-${charIndex}`,
                        text: char,
                        isCursor,
                        isSelected,
                        style: {
                            position: 'absolute',
                            left: `${currentWidth}px`,
                            top: `${displayRow * lineHeight}px`,
                            width: `${charWidth}px`,
                            height: `${lineHeight}px`
                        }
                    });

                    if (isCursor && this.editor && this.editor.insertMode) {
                        chars.push({
                            id: `cursor-line-${logicalRow}-${charIndex}`,
                            text: '',
                            isCursor: false,
                            isSelected: false,
                            style: {
                                position: 'absolute',
                                left: `${currentWidth}px`,
                                top: `${displayRow * lineHeight}px`,
                                width: '1px',
                                height: `${lineHeight}px`,
                                backgroundColor: 'white',
                                zIndex: 7
                            }
                        });
                    }

                    currentWidth += charWidth;
                    charIndex++;
                }

                if (logicalRow === row && col >= startCharIndex && col >= line.length) {
                    const cursorWidth = getPositionWidth(line, col, baseCharWidth) - scrollOffsetWidth;

                    if (cursorWidth >= 0 && cursorWidth < maxVisibleWidth) {
                        chars.push({
                            id: `char-${logicalRow}-${col}`,
                            text: ' ',
                            isCursor: true,
                            isSelected: false,
                            style: {
                                position: 'absolute',
                                left: `${cursorWidth}px`,
                                top: `${displayRow * lineHeight}px`,
                                width: `${baseCharWidth}px`,
                                height: `${lineHeight}px`
                            }
                        });

                        if (this.editor && this.editor.insertMode) {
                            chars.push({
                                id: `cursor-line-${logicalRow}-${col}`,
                                text: '',
                                isCursor: false,
                                isSelected: false,
                                style: {
                                    position: 'absolute',
                                    left: `${cursorWidth}px`,
                                    top: `${displayRow * lineHeight}px`,
                                    width: '1px',
                                    height: `${lineHeight}px`,
                                    backgroundColor: 'white',
                                    zIndex: 7
                                }
                            });
                        }
                    }
                }
            });

            return chars;
        },

        keyboardKeys(this: any) {
            const keyHeight = 34;
            const standardKeyWidth = 31;
            const fontSize = 20;

            const keyboardLayout = [
                [
                    { value: '`', displayText: '`' },
                    { value: '1', displayText: '1' },
                    { value: '2', displayText: '2' },
                    { value: '3', displayText: '3' },
                    { value: '4', displayText: '4' },
                    { value: '5', displayText: '5' },
                    { value: '6', displayText: '6' },
                    { value: '7', displayText: '7' },
                    { value: '8', displayText: '8' },
                    { value: '9', displayText: '9' },
                    { value: '0', displayText: '0' },
                    { value: '-', displayText: '-' },
                    { value: '=', displayText: '=' },
                    { value: 'Backspace', displayText: 'back', width: 2 },
                    { value: 'Insert', displayText: 'ins' },
                    { value: 'Home', displayText: 'hm' },
                    { value: 'PageUp', displayText: 'pu' },
                ],
                [
                    { value: 'Tab', displayText: 'Tab', width: 1.5 },
                    { value: 'q', displayText: 'Q' },
                    { value: 'w', displayText: 'W' },
                    { value: 'e', displayText: 'E' },
                    { value: 'r', displayText: 'R' },
                    { value: 't', displayText: 'T' },
                    { value: 'y', displayText: 'Y' },
                    { value: 'u', displayText: 'U' },
                    { value: 'i', displayText: 'I' },
                    { value: 'o', displayText: 'O' },
                    { value: 'p', displayText: 'P' },
                    { value: '[', displayText: '[' },
                    { value: ']', displayText: ']' },
                    { value: '\\', displayText: '\\', width: 1.5 },
                    { value: 'Delete', displayText: 'del' },
                    { value: 'End', displayText: 'ed' },
                    { value: 'PageDown', displayText: 'pd' },
                ],
                [
                    { value: 'CapsLock', displayText: 'Caps', width: 2 },
                    { value: 'a', displayText: 'A' },
                    { value: 's', displayText: 'S' },
                    { value: 'd', displayText: 'D' },
                    { value: 'f', displayText: 'F' },
                    { value: 'g', displayText: 'G' },
                    { value: 'h', displayText: 'H' },
                    { value: 'j', displayText: 'J' },
                    { value: 'k', displayText: 'K' },
                    { value: 'l', displayText: 'L' },
                    { value: ';', displayText: ';' },
                    { value: "'", displayText: "'" },
                    { value: 'Enter', displayText: 'Enter', width: 2 },
                ],
                [
                    { value: 'Shift', displayText: 'Shift', width: 2.5 },
                    { value: 'z', displayText: 'Z' },
                    { value: 'x', displayText: 'X' },
                    { value: 'c', displayText: 'C' },
                    { value: 'v', displayText: 'V' },
                    { value: 'b', displayText: 'B' },
                    { value: 'n', displayText: 'N' },
                    { value: 'm', displayText: 'M' },
                    { value: ',', displayText: ',' },
                    { value: '.', displayText: '.' },
                    { value: '/', displayText: '/' },
                    { value: 'Shift', displayText: 'Shift', width: 2.5 },
                    { value: 'ArrowUp', displayText: '↑', leftOffset: 1 },
                ],
                [
                    { value: 'Control', displayText: 'Ctrl', width: 1.5 },
                    { value: 'Zh', displayText: this.isChineseMode ? '中' : 'En', width: 1.5 },
                    { value: ' ', displayText: '', width: 8.5 },
                    { value: 'Scan', displayText: 'Sc' },
                    { value: 'Close', displayText: 'cl' },
                    { value: 'Control', displayText: 'Ctrl', width: 1.5 },
                    { value: 'ArrowLeft', displayText: '←' },
                    { value: 'ArrowDown', displayText: '↓' },
                    { value: 'ArrowRight', displayText: '→' },
                ],
            ];

            const generatedKeys: any[] = [];
            let keyId = 0;

            keyboardLayout.forEach((row, rowIndex) => {
                let currentX = 0;
                const currentY = rowIndex * keyHeight;
                row.forEach((keyConfig) => {
                    const keyWidth = Math.round((keyConfig.width || 1) * standardKeyWidth);
                    const isActive = this.isKeyActive(keyConfig.value);
                    if (keyConfig.leftOffset) { currentX += keyConfig.leftOffset * standardKeyWidth; }
                    let displayText = keyConfig.displayText;
                    if (this.editor && this.editor.shiftPressed &&
                        keyConfig.value.trim().length == 1 &&
                        !/[a-zA-Z]/.test(keyConfig.value)) {
                        displayText = this.editor.getShiftedChar(keyConfig.value);
                    }
                    generatedKeys.push({
                        id: `key-${keyId++}`,
                        value: keyConfig.value,
                        displayText,
                        isActive,
                        style: {
                            left: `${currentX}px`,
                            top: `${currentY}px`,
                            width: `${keyWidth}px`,
                            height: `${keyHeight}px`,
                            backgroundColor: isActive ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                            lineHeight: `${keyHeight}px`,
                            fontSize: `${fontSize}px`,
                        },
                    });
                    currentX += keyWidth;
                });
            });
            return generatedKeys;
        },

        candidateItems(this: any) {
            const startIndex = this.candidatePageIndex * 9;
            const endIndex = Math.min(startIndex + 9, this.candidates.length);
            this.visibleCandidates = this.candidates.slice(startIndex, endIndex);
            const elements = [];
            let leftOffset = 0;
            for (const index in this.visibleCandidates) {
                const candidate = this.visibleCandidates[index];
                elements.push({
                    id: `candidate-${index}`,
                    display: `${Number(index) + 1}. ${candidate.hanZi}`,
                    style: {
                        left: `${leftOffset}px`,
                        width: `${candidate.hanZi.length * 16 + 16}px`,
                    },
                    selected: index == this.selectedCandidateIndex,
                });
                leftOffset += candidate.hanZi.length * 16 + 16 + 5;
            }
            return elements;
        },
    },

    methods: {
        close() {
            $falcon.trigger<string>('softKeyboard', this.editor?.textBuffer.data.join('\n') || '');
            this.$page.finish();
        },
        clicked(key: string) {
            if (key === 'Close') { this.close(); }
            if (this.editor) {
                if (key === 'Zh') {
                    showLoading();
                    IME.initialize().then(() => {
                        hideLoading();
                        this.isChineseMode = !this.isChineseMode;
                        this.updatePinyin('');
                    });
                } else if (this.isChineseMode) {
                    this.handleChineseInput(key);
                } else {
                    this.editor.pressKey(key);
                }
                this.showKeyPopup(key);
                this.$forceUpdate();
            }
        },
        handlePunctuationInput(key: string) {
            const fullWidthPunctuationMap = new Map<string, string>([
                [',', '，'],
                ['.', '。'],
                [';', '；'],
                [':', '：'],
                ['?', '？'],
                ['!', '！'],
                ['(', '（'],
                [')', '）'],
                ['[', '【'],
                [']', '】'],
                ['"', '“”'],
                ["'", "‘’"],
                ['<', '《'],
                ['>', '》'],
                ['\\', '、'],
                ['/', '、'],
                ['_', '——'],
                ['$', '￥'],
                ['^', '……'],
                ['`', '·'],
            ]);

            let convertedKey = key;
            if (this.editor!.shiftPressed && fullWidthPunctuationMap.has(key)) {
                const shiftedChar = this.editor!.getShiftedChar(key);
                convertedKey = fullWidthPunctuationMap.get(shiftedChar) || fullWidthPunctuationMap.get(key) || key;
            } else if (fullWidthPunctuationMap.has(key)) {
                convertedKey = fullWidthPunctuationMap.get(key) || key;
            }
            if (convertedKey !== key) {
                this.editor!.handleInput(convertedKey);
            } else {
                this.editor!.pressKey(convertedKey);
            }
        },
        handleChineseInput(key: string) {
            if (!this.editor!.controlPressed && !this.editor!.shiftPressed && /^[a-zA-Z]$/.test(key)) {
                this.updatePinyin(this.currentPinyin + key.toLowerCase());
            } else if (key === 'Backspace' && this.currentPinyin.length > 0) {
                this.updatePinyin(this.currentPinyin.slice(0, -1));
            } else if (key === 'Enter') {
                this.editor!.handleInput(this.currentPinyin);
                this.updatePinyin('');
            } else if (this.candidates.length > 0) {
                if (/^[1-9]$/.test(key)) {
                    const index = parseInt(key) - 1;
                    if (index < this.visibleCandidates.length) {
                        this.selectCandidate(index);
                    }
                } else if (key === ' ') {
                    this.selectCandidate(this.selectedCandidateIndex);
                } else if (key === '=') {
                    this.nextCandidatePage();
                } else if (key === '-') {
                    this.prevCandidatePage();
                } else if (key === 'ArrowLeft') {
                    if (this.selectedCandidateIndex > 0) {
                        this.selectedCandidateIndex--;
                    } else {
                        this.prevCandidatePage();
                        this.selectedCandidateIndex = Math.min(9, this.visibleCandidates.length) - 1;
                    }
                } else if (key === 'ArrowRight') {
                    if (this.selectedCandidateIndex < this.visibleCandidates.length - 1) {
                        this.selectedCandidateIndex++;
                    } else {
                        this.nextCandidatePage();
                    }
                } else {
                    this.handlePunctuationInput(key);
                }
            } else {
                this.handlePunctuationInput(key);
            }
        },

        updatePinyin(newPinyin: string) {
            this.currentPinyin = newPinyin;
            this.candidates = IME.getCandidates(this.currentPinyin);
            this.candidatePageIndex = 0;
            this.selectedCandidateIndex = 0;
        },

        async selectCandidate(index: number) {
            if (index >= 0 && index < this.visibleCandidates.length) {
                const candidate = this.visibleCandidates[index];
                this.editor!.handleInput(candidate.hanZi);
                IME.updateWordFrequency(candidate.pinyin, candidate.hanZi);
                this.pinyinHistory.push(...candidate.pinyin);
                this.hanZiHistory += candidate.hanZi;
                const newPinyin = this.currentPinyin.slice(candidate.pinyin.join('').length);
                if (newPinyin.length === 0) {
                    IME.updateWordFrequency(this.pinyinHistory, this.hanZiHistory);
                    this.pinyinHistory = [];
                    this.hanZiHistory = '';
                }
                this.updatePinyin(newPinyin);
            }
        },

        nextCandidatePage() {
            if (this.candidatePageIndex < Math.ceil(this.candidates.length / 9) - 1) {
                this.candidatePageIndex++;
                this.selectedCandidateIndex = 0;
            }
        },

        prevCandidatePage() {
            if (this.candidatePageIndex > 0) {
                this.candidatePageIndex--;
                this.selectedCandidateIndex = 0;
            }
        },

        showKeyPopup(keyValue: string) {
            if (keyValue.trim().length !== 1) { return; }

            const keyElement = this.keyboardKeys.find(k => k.value === keyValue);
            if (!keyElement) return;

            let displayText = keyElement.displayText;
            if (this.editor && this.editor.shiftPressed) {
                displayText = this.editor.getShiftedChar(keyValue);
            }

            const keyLeft = parseInt(keyElement.style.left);
            const keyTop = parseInt(keyElement.style.top);
            const keyWidth = parseInt(keyElement.style.width);
            const popupWidth = 40;
            const popupHeight = 40;
            const popupTop = keyTop - popupHeight;
            this.keyPopup = {
                visible: true,
                displayText: displayText,
                style: {
                    left: `${keyLeft + keyWidth / 2 - popupWidth / 2}px`,
                    top: `${popupTop}px`,
                    width: `${popupWidth}px`,
                    height: `${popupHeight}px`,
                    lineHeight: `${popupHeight}px`,
                    fontSize: `${popupHeight * 0.8}px`,
                }
            };
            if (this.popupTimer) { clearTimeout(this.popupTimer); }
            this.popupTimer = setTimeout(() => {
                this.keyPopup.visible = false;
                this.popupTimer = null;
            }, 1000);
        },

        isKeyActive(key: any) {
            if (!this.editor) return false;
            switch (key) {
                case 'CapsLock':
                    return this.editor.capsLock;
                case 'Shift':
                    return this.editor.shiftPressed;
                case 'Control':
                    return this.editor.controlPressed;
                case 'Insert':
                    return this.editor.insertMode;
                case 'Scan':
                    return this.editor.scanEnabled;
                default:
                    return false;
            }
        }
    },
    beforeDestroy() {
        if (this.popupTimer) { clearTimeout(this.popupTimer); }
    }
});

export default softKeyboard;
