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
        <scroller class="container" scroll-direction="vertical" :show-scrollbar="true">
            <div class="section">
                <text class="section-title">消息导航</text>
                <div v-for="message in messages" :key="message.id" @click="jumpToMessage(message.id)"
                    class="message-card">
                    <text class="message-role">{{ ["用户", "助手", "系统"][message.role] }}</text>
                    <text class="message-content">{{ message.content }}</text>
                    <text class="message-time">{{ formatTime(message.timestamp) }}</text>
                </div>
            </div>
        </scroller>
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('aiNav.less');
</style>

<script>
import ToastMessage from '../../components/ToastMessage.vue';
import aiNav from './aiNav';
export default {
    ...aiNav,
    components: {
        ToastMessage
    }
}
</script>
