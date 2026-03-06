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
    <div v-if="isVisible" class="loading">
        <image-frame ref="images" class="loading-image" interval="50" auto-play="true" :src="[
            require('../../images/loading/01.png'),
            require('../../images/loading/02.png'),
            require('../../images/loading/03.png'),
            require('../../images/loading/04.png'),
            require('../../images/loading/05.png'),
            require('../../images/loading/06.png'),
            require('../../images/loading/07.png'),
            require('../../images/loading/08.png'),
            require('../../images/loading/09.png'),
            require('../../images/loading/10.png'),
            require('../../images/loading/11.png'),
            require('../../images/loading/12.png'),
            require('../../images/loading/13.png'),
            require('../../images/loading/14.png'),
            require('../../images/loading/15.png'),
            require('../../images/loading/16.png'),
            require('../../images/loading/17.png'),
            require('../../images/loading/18.png'),
            require('../../images/loading/19.png'),
            require('../../images/loading/20.png'),
            require('../../images/loading/21.png'),
            require('../../images/loading/22.png'),
            require('../../images/loading/23.png'),
            require('../../images/loading/24.png'),
            require('../../images/loading/25.png'),
            require('../../images/loading/26.png'),
            require('../../images/loading/27.png'),
        ]" />
    </div>
</template>

<style lang="less" scoped>
.loading {
    position: absolute;
    width: 560px;
    height: 170px;
    left: 0px;
    top: 0px;
}

.loading-image {
    position: absolute;
    left: 255px;
    top: 60px;
    width: 50px;
    height: 50px;
    z-index: 11;
}
</style>

<script>
import LoadingComponent from './Loading';
export default LoadingComponent;
</script>
