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
        <div class="container" style="display: flex; flex-direction: column;">
            <div style="flex: 1; display: flex; flex-direction: row;">
                <scroller ref="messageScroller" class="messages-scroller" scroll-direction="vertical"
                    :show-scrollbar="true">
                    <div v-for="message in displayMessages" :key="message.id">
                        <text :class="'message message-' + message.role">{{ message.content }}</text>
                        <text v-if="![0, 1, 6].includes(message.stopReason)" class="stop-reason-warning">{{
                            getStopReasonText(message.stopReason) }}</text>
                        <div v-if="message.role === 0 || message.role === 1"
                            :class="message.role === 0 ? 'message-actions-user' : 'message-actions'">
                            <text v-if="message.role === 0" @click="editUserMessage(message.id)"
                                :class="'square-btn' + (isStreaming ? ' square-btn-disabled' : '')">编</text>
                            <text v-if="message.role === 1" @click="regenerateMessage(message.id)"
                                :class="'square-btn' + (isStreaming ? ' square-btn-disabled' : '')">重</text>
                            <text @click="switchVariant(message.id, -1, message.role === 1)"
                                :class="'square-btn' + ((canGoVariant(message.id, -1) && !isStreaming) ? '' : ' square-btn-disabled')">左</text>
                            <text class="action-text">{{ getVariantInfo(message.id) }}</text>
                            <text @click="switchVariant(message.id, 1, message.role === 1)"
                                :class="'square-btn' + ((canGoVariant(message.id, 1) && !isStreaming) ? '' : ' square-btn-disabled')">右</text>
                        </div>
                    </div>
                </scroller>

                <div class="side-buttons">
                    <text @click="openHistory"
                        :class="'square-btn' + (isStreaming ? ' square-btn-disabled' : '')">历</text>
                    <text @click="openMessageNavigation"
                        :class="'square-btn' + (isStreaming ? ' square-btn-disabled' : '')">导</text>
                    <text @click="openSettings"
                        :class="'square-btn' + (isStreaming ? ' square-btn-disabled' : '')">设</text>
                </div>
            </div>

            <div class="item">
                <text :class="'item-input' + (isStreaming ? ' item-input-disabled' : '')" @click="loadSoftKeyboard">{{
                    currentInput || '点击输入...' }}</text>
                <text v-if="!isStreaming" @click="sendMessage(this.currentInput)"
                    :class="'square-btn square-btn-' + (this.canSendMessage ? 'primary' : 'disabled')">发</text>
                <text v-else @click="stopGeneration" class="square-btn square-btn-danger">停</text>
            </div>
        </div>
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('ai.less');
</style>

<script>
import ToastMessage from '../../components/ToastMessage.vue';
import ai from './ai';
export default {
    ...ai,
    components: {
        ToastMessage
    }
}
</script>
