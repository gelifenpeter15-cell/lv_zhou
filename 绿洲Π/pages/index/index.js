Page({
  data: {
    // Weather forecast data - only keep weather functionality
    weather: {
      city: 'Loading...',
      temperature: '--',
      description: 'Loading weather...',
      icon: ''
    },
    // 出行建议数据
    travelAdvice: {
      suggestion: 'Loading travel advice...',
      icon: '🚶',
      level: 'info' // info, warning, danger
    }
  },
  
  onLoad: function() {
    // 页面加载时获取地理位置和天气
    this.getLocationAndWeather();
  },
  
  onPullDownRefresh: function() {
    // 下拉刷新时重新获取天气
    this.getLocationAndWeather();
    wx.stopPullDownRefresh();
  },
  
  // 手动刷新位置
  refreshLocation: function() {
    wx.showLoading({ title: '获取位置中...' });
    this.getLocationAndWeather();
  },
  
  // 获取地理位置和天气
  getLocationAndWeather: function() {
    const that = this;
    
    // 检查位置权限
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.userLocation']) {
          // 未授权位置权限
          wx.showModal({
            title: '位置权限请求',
            content: '需要您的位置权限来获取当地天气',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting(); // 引导用户打开设置
              } else {
                that.fetchWeatherData('北京'); // 使用默认城市
              }
            }
          });
          return;
        }
        
        // 已授权，获取位置
        wx.getLocation({
          type: 'wgs84',
          success: function(res) {
            const latitude = res.latitude;
            const longitude = res.longitude;
            console.log('获取地理位置成功：', latitude, longitude);
            
            // 使用百度地图API将坐标转换为城市名称
            that.getCityName(latitude, longitude, function(cityName) {
              if (cityName) {
                console.log('获取城市名称成功：', cityName);
                that.fetchWeatherData(cityName);
              } else {
                console.log('获取城市名称失败，使用默认城市');
                wx.showToast({
                  title: '位置识别失败',
                  icon: 'none'
                });
                that.fetchWeatherData('北京');
              }
            });
          },
          fail: function(err) {
            console.log('获取地理位置失败：', err);
            wx.showToast({
              title: '获取位置失败',
              icon: 'none'
            });
            that.fetchWeatherData('北京');
          }
        });
      }
    });
  },
  
  // 使用百度地图API获取城市名称
  getCityName: function(latitude, longitude, callback) {
    const ak = '8lko9fieCjdGAGgYYxJToXGth7WLyUkV'; // 百度地图API密钥
    const url = `https://api.map.baidu.com/reverse_geocoding/v3/?ak=${ak}&output=json&coordtype=wgs84ll&location=${latitude},${longitude}`;
    
    // 添加超时设置
    const requestTask = wx.request({
    
      url: url,
      method: 'GET',
      timeout: 5000, // 5秒超时
      success: function(res) {
        console.log('百度地图API响应：', res);
        if (res.data && res.data.status === 0 && res.data.result) {
          const addressComponent = res.data.result.addressComponent;
          // 更灵活的城市名处理
          let city = addressComponent.city || 
                     addressComponent.district || 
                     addressComponent.province || 
                     '北京';
          
          // 移除"市"字但保留其他行政区划
          if (city.endsWith('市')) {
            city = city.slice(0, -1);
          }
          callback(city);
        } else {
          console.error('百度地图API返回错误:', res.data);
          callback(null);
        }
      },
      fail: function(err) {
        console.log('百度地图API调用失败：', err);
        callback(null);
      }
    });
    
    // 超时处理
    setTimeout(() => {
      if (requestTask) {
        requestTask.abort();
        console.log('百度地图API请求超时');
        callback(null);
      }
    }, 5000);
  },
  
  // 获取天气数据（使用OpenWeatherMap作为主API，和风天气作为备用）
  fetchWeatherData: function(city) {
    const that = this;
    let env = 'release';
    try {
      // 正确获取环境信息
      const accountInfo = wx.getAccountInfoSync();
      env = accountInfo.miniProgram.envVersion;
    } catch (e) {
      console.error('获取环境信息失败', e);
    }
    
    // 从环境变量获取OpenWeatherMap API密钥
    let openWeatherApiKey = env === 'develop' ? 
                           '4c5526f8082f706a704acece9bf9cd66' :  // 使用用户提供的密钥
                           wx.cloud.getEnv().OPENWEATHER_API_KEY;
    
    // 从环境变量获取和风天气API密钥
    let qWeatherApiKey = env === 'develop' ? 
                        'c1f45df473e1429a8f19e410fd8ffd07' : 
                        wx.cloud.getEnv().QWEATHER_API_KEY;
    
    // 优先使用OpenWeatherMap API
    const openWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${openWeatherApiKey}&units=metric&lang=zh_cn`;
    
    console.log('OpenWeatherMap API请求URL：', openWeatherUrl);
    
    wx.request({
      url: openWeatherUrl,
      method: 'GET',
      success: function(owRes) {
        console.log('OpenWeatherMap API响应：', owRes);
        if (owRes.data && owRes.data.main && owRes.data.weather && owRes.data.weather.length > 0) {
          const main = owRes.data.main;
          const weather = owRes.data.weather[0];
          const wind = owRes.data.wind || {};
          
          const temperature = Math.round(main.temp || 0);
          const weatherId = weather.id || 800;
          const weatherDescText = weather.description || '晴朗';
          const windSpeed = Math.round((wind.speed || 0) * 3.6); // 转换为km/h
          const humidity = main.humidity || 0;
          
          that.setData({
            weather: {
              city: city,
              temperature: temperature,
              description: weatherDescText,
              icon: that.getWeatherIcon(weatherId.toString())
            }
          });
          
          // 生成出行建议
          that.generateTravelAdvice(temperature, weatherId.toString(), windSpeed, humidity);
        } else {
          let errorMsg = 'OpenWeatherMap API返回数据不完整';
          if (owRes.data && owRes.data.message) {
            errorMsg += `: ${owRes.data.message}`;
          }
          console.log(errorMsg);
          // 尝试使用备用API - 和风天气
          that.fetchQWeatherData(city, qWeatherApiKey);
        }
      },
      fail: function(owErr) {
        console.log('OpenWeatherMap API调用失败：', owErr);
        // 尝试使用备用API - 和风天气
        that.fetchQWeatherData(city, qWeatherApiKey);
      }
    });
  },
  
  // 使用和风天气API作为备用
  fetchQWeatherData: function(city, apiKey) {
    const that = this;
    if (!apiKey) {
      that.useFallbackWeatherData(city);
      return;
    }
    
    // 使用免费版API域名
    const baseUrl = 'https://api.qweather.com/v7/weather/now';
    
    // 生成当前时间戳（和风天气API要求）
    const timestamp = Math.floor(Date.now() / 1000);
    
    // 构建查询参数
    const params = {
      location: encodeURIComponent(city),
      key: apiKey,
      lang: 'zh',
      t: timestamp
    };
    
    // 生成查询字符串
    const queryString = Object.keys(params)
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    const url = `${baseUrl}?${queryString}`;
    
    console.log('和风天气备用API请求URL：', url);
    
    wx.request({
      url: url,
      method: 'GET',
      success: function(res) {
        console.log('和风天气API响应：', res);
        if (res.data) {
          console.log('完整API响应：', res.data);
        }
        
        if (res.data && res.data.code === '200' && res.data.now) {
          const now = res.data.now;
          
          const temperature = parseInt(now.temp || 0);
          const icon = now.icon || '100';
          const weatherDescText = now.text || '晴朗';
          const windSpeed = parseInt(now.windSpeed || 0);
          const humidity = parseInt(now.humidity || 0);
          
          that.setData({
            weather: {
              city: city,
              temperature: temperature,
              description: weatherDescText,
              icon: that.getWeatherIcon(icon)
            }
          });
          
          // 生成出行建议
          that.generateTravelAdvice(temperature, icon, windSpeed, humidity);
        } else {
          let errorMsg = '和风天气API返回错误';
          if (res.data && res.data.code) {
            errorMsg += `，错误码：${res.data.code}`;
          }
          if (res.data && res.data.message) {
            errorMsg += `，消息：${res.data.message}`;
          }
          console.log(errorMsg);
          that.useFallbackWeatherData(city);
        }
      },
      fail: function(err) {
        console.log('和风天气API调用失败：', err);
        that.useFallbackWeatherData(city);
      }
    });
  },
  
  // 使用模拟数据
  useFallbackWeatherData: function(city) {
    this.setData({
      weather: {
        city: city,
        temperature: 22,
        description: '晴朗',
        icon: '☀️'
      }
    });
    
    // 生成默认出行建议
    this.generateTravelAdvice(22, '113', 10, 50);
  },
  
  // 获取天气图标
  getWeatherIcon: function(weatherCode) {
    const iconMap = {
      '113': '☀️', // Sunny
      '116': '⛅', // Partly cloudy
      '119': '☁️', // Cloudy
      '122': '☁️', // Overcast
      '143': '🌫️', // Mist
      '176': '🌦️', // Patchy rain possible
      '179': '🌨️', // Patchy snow possible
      '182': '�️', // Patchy sleet possible
      '185': '�️', // Patchy freezing drizzle possible
      '200': '⛈️', // Thundery outbreaks possible
      '227': '�️', // Blowing snow
      '230': '�️', // Blizzard
      '248': '🌫️', // Fog
      '260': '🌫️', // Freezing fog
      '263': '🌦️', // Patchy light drizzle
      '266': '🌦️', // Light drizzle
      '281': '�️', // Freezing drizzle
      '284': '�️', // Heavy freezing drizzle
      '293': '🌦️', // Patchy light rain
      '296': '🌦️', // Light rain
      '299': '🌧️', // Moderate rain at times
      '302': '🌧️', // Moderate rain
      '305': '🌧️', // Heavy rain at times
      '308': '🌧️', // Heavy rain
      '311': '🌨️', // Light freezing rain
      '314': '🌨️', // Moderate or heavy freezing rain
      '317': '🌨️', // Light sleet
      '320': '🌨️', // Moderate or heavy sleet
      '323': '🌨️', // Patchy light snow
      '326': '🌨️', // Light snow
      '329': '🌨️', // Patchy moderate snow
      '332': '🌨️', // Moderate snow
      '335': '🌨️', // Patchy heavy snow
      '338': '🌨️', // Heavy snow
      '350': '🌨️', // Ice pellets
      '353': '🌦️', // Light rain shower
      '356': '🌧️', // Moderate or heavy rain shower
      '359': '🌧️', // Torrential rain shower
      '362': '🌨️', // Light sleet showers
      '365': '🌨️', // Moderate or heavy sleet showers
      '368': '🌨️', // Light snow showers
      '371': '🌨️', // Moderate or heavy snow showers
      '374': '🌨️', // Light showers of ice pellets
      '377': '🌨️', // Moderate or heavy showers of ice pellets
      '386': '⛈️', // Patchy light rain with thunder
      '389': '⛈️', // Moderate or heavy rain with thunder
      '392': '⛈️', // Patchy light snow with thunder
      '395': '⛈️' // Moderate or heavy snow with thunder
    };
    
    return iconMap[weatherCode] || '🌤️';
  },
  
  // 生成出行建议
  generateTravelAdvice: function(temperature, weatherCode, windSpeed, humidity) {
    let suggestion = '';
    let icon = '🚶';
    let level = 'info';
    
    // 恶劣天气代码组（危险级别）
    const dangerousWeather = ['200', '227', '230', '248', '260', '305', '308', '311', '314', '317', '320', '332', '335', '338', '350', '359', '365', '371', '374', '377', '386', '389', '392', '395'];
    // 中等天气代码组（警告级别）
    const warningWeather = ['176', '179', '182', '185', '263', '266', '281', '284', '293', '296', '299', '302', '353', '356', '362', '368'];
    
    // 判断天气状况
    if (dangerousWeather.includes(weatherCode)) {
      // 危险天气
      level = 'danger';
      if (['227', '230'].includes(weatherCode)) {
        suggestion = '暴风雪天气，建议取消出行计划，确保人身安全';
        icon = '⚠️';
      } else if (['305', '308', '359'].includes(weatherCode)) {
        suggestion = '大雨天气，建议避免外出，如需出行请携带雨具';
        icon = '☔';
      } else if (['386', '389', '392', '395'].includes(weatherCode)) {
        suggestion = '雷雨天气，建议待在室内，避免在空旷地带活动';
        icon = '⚡';
      } else if (['248', '260'].includes(weatherCode)) {
        suggestion = '大雾天气，能见度低，建议减少驾车出行';
        icon = '🌫️';
      } else {
        suggestion = '恶劣天气，建议谨慎出行，注意安全';
        icon = '⚠️';
      }
    } else if (warningWeather.includes(weatherCode)) {
      // 警告天气
      level = 'warning';
      if (['176', '293', '296', '353'].includes(weatherCode)) {
        suggestion = '小雨天气，建议携带雨具，适合短途出行';
        icon = '🌦️';
      } else if (['299', '302', '356'].includes(weatherCode)) {
        suggestion = '中雨天气，建议减少户外活动，注意防雨';
        icon = '🌧️';
      } else if (['179', '182', '185', '323', '326', '362', '368'].includes(weatherCode)) {
        suggestion = '降雪天气，路面湿滑，出行请注意安全';
        icon = '🌨️';
      } else {
        suggestion = '天气一般，建议根据具体情况安排出行';
        icon = '🌤️';
      }
    } else {
      // 好天气
      level = 'info';
      
      // 基于温度和风速的额外建议
      if (temperature >= 35) {
        suggestion = '高温天气，建议避免长时间户外活动，注意防暑';
        icon = '🌡️';
      } else if (temperature <= -10) {
        suggestion = '严寒天气，建议做好保暖措施，减少户外停留时间';
        icon = '❄️';
      } else if (temperature <= 0) {
        suggestion = '低温天气，建议穿着保暖，适合短途出行';
        icon = '🧥';
      } else if (windSpeed >= 40) {
        suggestion = '大风天气，建议避免在高楼或树下行走';
        icon = '💨';
      } else if (humidity >= 80) {
        suggestion = '湿度较高，体感闷热，建议适量补水';
        icon = '💧';
      } else if (temperature >= 25 && temperature <= 30) {
        suggestion = '天气舒适，非常适合户外活动和出行';
        icon = '🌞';
      } else if (temperature >= 15 && temperature < 25) {
        suggestion = '温度宜人，是出行的好天气';
        icon = '🚶';
      } else {
        suggestion = '天气不错，适合安排各类出行活动';
        icon = '🌤️';
      }
    }
    
    this.setData({
      travelAdvice: {
        suggestion: suggestion,
        icon: icon,
        level: level
      }
    });
  }
})
