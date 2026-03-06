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
                <text class="section-title">搜索和管理</text>

                <div class="item">
                    <text class="item-text">搜索对话</text>
                    <text class="item-input" @click="editSearchKeyword">{{ searchKeyword || '点击搜索对话...' }}</text>
                    <text v-if="searchKeyword" @click="clearSearch" class="btn btn-danger">清除</text>
                </div>

                <div class="item">
                    <text class="item-text">总计</text>
                    <text class="count-text">{{ conversationList.length }} 个对话</text>
                    <text @click="createConversation" class="btn btn-success">新建对话</text>
                </div>
            </div>

            <div class="section">
                <text class="section-title">对话列表</text>

                <div v-for="conversation in filteredConversations" :key="conversation.id" class="conversation-card">
                    <div class="conversation-main" @click="loadConversation(conversation.id)">
                        <text class="conversation-title">{{ conversation.title }}</text>
                        <text v-if="conversation.id === currentConversationId" class="current-indicator">当前</text>
                        <text class="conversation-time">{{ formatTime(conversation.updatedAt) }}</text>
                    </div>

                    <div class="conversation-actions">
                        <text @click="editConversationTitle(conversation.id, conversation.title)"
                            class="btn btn-warning">编辑</text>
                        <text @click="deleteConversation(conversation.id)" class="btn btn-danger">删除</text>
                    </div>
                </div>

                <div v-if="filteredConversations.length == 0" class="empty-section">
                    <text class="empty-title">没有找到匹配的对话</text>
                </div>
            </div>
        </scroller>
        <Loading />
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('aiHistory.less');
</style>

<script>
import aiHistory from './aiHistory';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
    ...aiHistory,
    components: {
        Loading,
        ToastMessage,
    }
};
</script>
