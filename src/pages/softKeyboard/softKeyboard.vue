<!--
    Copyright (C) 2025 Langning Chen

    This file is part of miniapp.

    miniapp is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    miniapp is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with miniapp.  If not, see <https://www.gnu.org/licenses/>.
-->

<template>
    <div>
        <div class="editor-content">
            <text v-for="char in allChars" :key="char.id" :style="char.style" :class="{
                'cursor-overwrite': char.isCursor && editor && !editor.insertMode,
                'selected': char.isSelected
            }" class="editor-char">{{ char.text || ' ' }}</text>
        </div>
        <text v-if="isChineseMode" class="pinyin-display">{{ currentPinyin }}</text>
        <text v-for="candidate in candidateItems" :key="candidate.id" :class="{
            'candidate-selected': candidate.selected,
        }" class="candidate-item" :style="candidate.style">{{ candidate.display }}</text>
        <text v-for="key in keyboardKeys" :key="key.id" :style="key.style" class="key" @click="clicked(key.value)">{{
            key.displayText }}</text>
        <text v-if="keyPopup.visible" :style="keyPopup.style" class="key-popup">{{ keyPopup.displayText }}</text>
        <Loading />
    </div>
</template>

<style lang="less" scoped>
@import url('softKeyboard.less');
</style>

<script>
import Loading from '../../components/Loading.vue';
import softKeyboard from './softKeyboard';
export default {
    ...softKeyboard,
    components: {
        Loading
    }
}
</script>
