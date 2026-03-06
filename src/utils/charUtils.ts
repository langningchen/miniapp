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

/**
 * 计算字符的显示宽度
 * @param char 要计算宽度的字符
 * @param baseWidth 基础字符宽度，默认8px
 * @returns 字符的显示宽度（像素）
 */
export function getCharWidth(char: string, baseWidth: number = 8): number {
    if (!char) return baseWidth;

    const charCode = char.charCodeAt(0);

    // 检查是否为中文字符、全角字符等
    if (charCode >= 0x4E00 && charCode <= 0x9FFF || // CJK统一汉字
        charCode >= 0x3400 && charCode <= 0x4DBF || // CJK扩展A
        charCode >= 0xFF00 && charCode <= 0xFFEF || // 全角字符
        charCode >= 0x3000 && charCode <= 0x303F || // CJK符号和标点
        charCode >= 0x2E80 && charCode <= 0x2EFF) { // CJK部首补充
        return baseWidth * 2; // 中文字符占两倍宽度
    }

    return baseWidth;
}

/**
 * 计算从行首到指定位置的总宽度
 * @param line 文本行
 * @param position 字符位置
 * @param baseWidth 基础字符宽度，默认8px
 * @returns 总宽度（像素）
 */
export function getPositionWidth(line: string, position: number, baseWidth: number = 8): number {
    let totalWidth = 0;
    for (let i = 0; i < Math.min(position, line.length); i++) {
        totalWidth += getCharWidth(line[i], baseWidth);
    }
    return totalWidth;
}

/**
 * 根据像素位置找到最接近的字符位置
 * @param line 文本行
 * @param targetWidth 目标像素位置
 * @param baseWidth 基础字符宽度，默认8px
 * @returns 字符位置
 */
export function findCharPositionByWidth(line: string, targetWidth: number, baseWidth: number = 8): number {
    let currentWidth = 0;
    let position = 0;

    for (let i = 0; i < line.length; i++) {
        const charWidth = getCharWidth(line[i], baseWidth);
        if (currentWidth + charWidth / 2 > targetWidth) {
            break;
        }
        currentWidth += charWidth;
        position = i + 1;
    }

    return position;
}
