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
    <scroller class="container" scroll-direction="vertical" :show-scrollbar="true">
        <div class="section">
            <text class="section-title">可用功能</text>

            <div class="item"><text class="item-text" @click="openAi">AI 助手114</text></div>
        </div>
    </scroller>
</template>

<style lang="less" scoped>
@import url('index.less');
</style>

<script>
import index from './index';
export default index;
</script>
