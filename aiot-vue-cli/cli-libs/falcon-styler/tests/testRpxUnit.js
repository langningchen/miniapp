let index = require('../index')

let res = index.parse(`
.tabbar_box {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 999;
  width: 750rpx;
  height: 148px;

  /* border-top: 0.5rpx solid #d5d5d5; */
  border-top-left-radius: 40rpx;
  border-top-right-radius: 40rpx;
  background-color:#1F2326;
  border-top-color:white;
  bottom:0;
}

.tabbar_nav {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 16rpx;
  height: 100%;
}
.tabbar_icon {
  width: 44rpx;
  height: 44rpx;
  margin-top: 32rpx;
}
.tabbar_text{
  margin-top:24rpx;
  font-size: 22rpx;
  color: white;
}
`, (err, data) => {
  console.log(data.jsonStyle)
  console.log(data.log)
})
