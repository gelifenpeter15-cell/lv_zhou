// 天气API测试脚本
Page({
  data: {
    testResult: 'Testing...',
    apiStatus: 'unknown',
    weatherData: null
  },
  
  onLoad: function() {
    this.testWeatherAPI();
  },
  
  testWeatherAPI: function() {
    const that = this;
    const testUrl = 'https://wttr.in/Beijing?format=j1&lang=zh';
    
    console.log('开始测试天气API...');
    
    wx.request({
      url: testUrl,
      method: 'GET',
      timeout: 10000, // 10秒超时
      success: function(res) {
        console.log('API响应状态码:', res.statusCode);
        console.log('API响应数据:', res.data);
        
        if (res.statusCode === 200 && res.data) {
          that.setData({
            testResult: 'API调用成功！',
            apiStatus: 'success',
            weatherData: res.data
          });
          
          // 解析关键数据
          const current = res.data.current_condition[0];
          const weather = res.data.weather[0];
          
          console.log('当前温度:', current.temp_C);
          console.log('天气描述:', weather.weatherDesc[0].value);
          console.log('天气代码:', current.weatherCode);
          console.log('风速:', current.windspeedKmph);
          console.log('湿度:', current.humidity);
          
        } else {
          that.setData({
            testResult: `API调用失败，状态码: ${res.statusCode}`,
            apiStatus: 'error'
          });
        }
      },
      fail: function(err) {
        console.error('API调用失败:', err);
        that.setData({
          testResult: `网络请求失败: ${err.errMsg || '未知错误'}`,
          apiStatus: 'error'
        });
      },
      complete: function() {
        console.log('API测试完成');
      }
    });
  }
});
