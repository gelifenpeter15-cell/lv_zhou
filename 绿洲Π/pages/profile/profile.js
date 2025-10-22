console.log('Loading pages/profile/profile.js'); // Added log to check if file is loaded
Page({
  data: {
    userInfo: null,
    hasUserInfo: false,

    // Exercise Record Data
    exerciseRecords: [], // To store exercise records
    // Add other exercise-related data if needed, e.g., for adding new records

    // Visibility control for sections
    showExerciseSection: false
  },

  onLoad: function(options) {
    // Load user info
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true
      });
    }

  },

  onShow: function() {
    // Load saved travel plan if it exists
    const lastTravelPlan = wx.getStorageSync('lastTravelPlan');
    if (lastTravelPlan) {
      this.setData({
        destination: lastTravelPlan.destination || '',
        startDate: lastTravelPlan.startDate || '',
        endDate: lastTravelPlan.endDate || '',
        itinerary: lastTravelPlan.itinerary || [],
        startLocation: lastTravelPlan.startLocation || '',
        endLocation: lastTravelPlan.endLocation || '',
        exerciseRoute: lastTravelPlan.exerciseRoute || null,
        latitude: lastTravelPlan.latitude || 39.9042,
        longitude: lastTravelPlan.longitude || 116.4074,
        markers: lastTravelPlan.markers || [{
          id: 1,
          latitude: 39.9042,
          longitude: 116.4074,
          title: '默认位置',
          iconPath: '/images/marker.png',
          width: 30,
          height: 30
        }],
        polyline: lastTravelPlan.polyline || [],
      });
    }
    // Re-check user info if not already loaded or if it was cleared
    if (!this.data.hasUserInfo) {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.setData({
          userInfo: userInfo,
          hasUserInfo: true
        });
      }
    }
  },

  // --- User Profile Functions ---
  getUserProfile() {
    wx.getUserProfile({
      desc: '获取个人信息', // Description for the user
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        });
        // Save user info to local storage for caching
        wx.setStorageSync('userInfo', res.userInfo);
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
      }
    });
  },
  goToSettings() {
    // Navigate to settings page
    wx.navigateTo({
      url: '/pages/settings/settings' // Assuming a settings page exists
    });
  },
  goToAboutUs() {
    // Navigate to about us page
    wx.navigateTo({
      url: '/pages/about/about' // Assuming an about page exists
    });
  },
  logout() {
    wx.removeStorageSync('userInfo'); // Remove cached user info
    this.setData({
      userInfo: null,
      hasUserInfo: false
    });
    wx.showToast({
      title: '已退出登录',
      icon: 'success'
    });
  },

  // --- Navigation/Section Toggle Functions ---
  toggleExerciseSection() {
    this.setData({
      showExerciseSection: !this.data.showExerciseSection,
    });
  },
  toggleTravelSection() {
    this.setData({
      showTravelSection: !this.data.showTravelSection,
    });
  },

  // --- Travel Plan Functions ---
  // Input change handlers
  onDestinationChange(e) {
    this.setData({
      destination: e.detail.value
    });
    if (e.detail.value) {
      this.getCoordinates(e.detail.value);
    } else {
      this.setData({
        latitude: 39.9042,
        longitude: 116.4074,
        markers: [{
          id: 1,
          latitude: 39.9042,
          longitude: 116.4074,
          title: '默认位置',
          iconPath: '/images/marker.png',
          width: 30,
          height: 30
        }],
        polyline: []
      });
    }
  },
  onStartDateChange(e) {
    this.setData({
      startDate: e.detail.value
    });
  },
  onEndDateChange(e) {
    this.setData({
      endDate: e.detail.value
    });
  },
  onStartLocationChange(e) {
    this.setData({
      startLocation: e.detail.value
    });
  },
  onEndLocationChange(e) {
    this.setData({
      endLocation: e.detail.value
    });
  },

  // Geocoding function
  getCoordinates(address) {
    const ak = 'xT6kHoORweeTsxaoEGUVRV3Puc16ImoQ'; // Baidu Maps AK
    if (!ak || ak === 'YOUR_BAIDU_MAPS_AK') {
      console.warn('Baidu Maps AK is not set. Geocoding will not work.');
      wx.showToast({ title: '地图服务未配置', icon: 'none' });
      return;
    }
    const geocodeUrl = `https://api.map.baidu.com/geocoder/v2/?address=${encodeURIComponent(address)}&output=json&ak=${ak}`;

    wx.request({
      url: geocodeUrl,
      success: (res) => {
        if (res.data && res.data.status === 0) {
          const location = res.data.result.location;
          this.setData({
            latitude: location.lat,
            longitude: location.lng,
            markers: [{
              id: Date.now(),
              latitude: location.lat,
              longitude: location.lng,
              title: address,
              iconPath: '/images/marker.png',
              width: 30,
              height: 30
            }],
            polyline: []
          });
        } else {
          console.error('Geocoding failed:', res.data);
          wx.showToast({
            title: '无法获取地址坐标',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('Request failed:', err);
        wx.showToast({
          title: '网络错误，无法获取坐标',
          icon: 'none'
        });
      }
    });
  },

  // Location Tracking Functions
  startLocationTracking() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const currentLocation = {
          latitude: res.latitude,
          longitude: res.longitude
        };
        this.setData({
          currentLocation: currentLocation,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          markers: (this.data.markers || []).concat([{
            id: Date.now(),
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            title: '当前位置',
            iconPath: '/images/current_location_marker.png',
            width: 30,
            height: 30
          }])
        });

        const intervalId = setInterval(() => {
          this.updateLocation();
        }, 5000);
        this.setData({ trackingInterval: intervalId });
      },
      fail: (err) => {
        console.error('Failed to get location:', err);
        wx.showToast({
          title: '无法获取当前位置，请检查权限设置',
          icon: 'none'
        });
      }
    });
  },
  updateLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const currentLocation = {
          latitude: res.latitude,
          longitude: res.longitude
        };
        this.setData({
          currentLocation: currentLocation,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          markers: this.data.markers.map(marker => {
            if (marker.title === '当前位置') {
              return {
                ...marker,
                id: Date.now(),
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude
              };
            }
            return marker;
          })
        });
        if (this.data.mapContext) {
          this.data.mapContext.moveToLocation({
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            duration: 100
          });
        }
      },
      fail: (err) => {
        console.error('Failed to update location:', err);
      }
    });
  },
  stopLocationTracking() {
    if (this.data.trackingInterval) {
      clearInterval(this.data.trackingInterval);
      this.setData({ trackingInterval: null });
    }
  },

  // Route Calculation Functions
  calculateRoute() {
    if (!this.data.startLocation || !this.data.endLocation) {
      wx.showToast({
        title: '请输入起点和终点',
        icon: 'none'
      });
      return;
    }
    this.getCoordinatesForRouteCalculation();
  },
  getCoordinatesForRouteCalculation() {
    const ak = 'xT6kHoORweeTsxaoEGUVRV3Puc16ImoQ'; // Baidu Maps AK
    if (!ak || ak === 'YOUR_BAIDU_MAPS_AK') {
      console.warn('Baidu Maps AK is not set. Route calculation will not work.');
      wx.showToast({ title: '地图服务未配置', icon: 'none' });
      return;
    }
    const startLocation = this.data.startLocation;
    const endLocation = this.data.endLocation;

    const getStartCoords = new Promise((resolve, reject) => {
      const startUrl = `https://api.map.baidu.com/geocoder/v2/?address=${encodeURIComponent(startLocation)}&output=json&ak=${ak}`;
      wx.request({
        url: startUrl,
        success: (res) => {
          if (res.data && res.data.status === 0) {
            resolve(res.data.result.location);
          } else {
            reject('无法获取起点坐标');
          }
        },
        fail: (err) => reject(err)
      });
    });

    const getEndCoords = new Promise((resolve, reject) => {
      const endUrl = `https://api.map.baidu.com/geocoder/v2/?address=${encodeURIComponent(endLocation)}&output=json&ak=${ak}`;
      wx.request({
        url: endUrl,
        success: (res) => {
          if (res.data && res.data.status === 0) {
            resolve(res.data.result.location);
          } else {
            reject('无法获取终点坐标');
          }
        },
        fail: (err) => reject(err)
      });
    });

    Promise.all([getStartCoords, getEndCoords])
      .then(([startCoords, endCoords]) => {
        this.setData({
          latitude: startCoords.lat,
          longitude: startCoords.lng,
          markers: [
            ...this.data.markers.filter(m => m.title !== '当前位置' && m.title !== startLocation && m.title !== endLocation),
            {
              id: Date.now() + 1,
              latitude: startCoords.lat,
              longitude: startCoords.lng,
              title: startLocation,
              iconPath: '/images/start_marker.png',
              width: 30,
              height: 30
            },
            {
              id: Date.now() + 2,
              latitude: endCoords.lat,
              longitude: endCoords.lng,
              title: endLocation,
              iconPath: '/images/end_marker.png',
              width: 30,
              height: 30
            }
          ]
        });
        this.getRoute(startCoords, endCoords);
      })
      .catch(error => {
        console.error('Coordinate fetching error:', error);
        wx.showToast({
          title: error || '获取坐标失败',
          icon: 'none'
        });
      });
  },
  getRoute(startCoords, endCoords) {
    const ak = 'xT6kHoORweeTsxaoEGUVRV3Puc16ImoQ'; // Baidu Maps AK
    if (!ak || ak === 'YOUR_BAIDU_MAPS_AK') {
      console.warn('Baidu Maps AK is not set. Route calculation will not work.');
      wx.showToast({ title: '地图服务未配置', icon: 'none' });
      return;
    }
    const routeUrl = `https://api.map.baidu.com/direction/v2/driving?origin=${startCoords.lat},${startCoords.lng}&destination=${endCoords.lat},${endCoords.lng}&ak=${ak}`;

    wx.request({
      url: routeUrl,
      success: (res) => {
        if (res.data && res.data.status === 0) {
          const routes = res.data.result.routes;
          if (routes && routes.length > 0) {
            const route = routes[0];
            const points = [];
            
            if (route.path && Array.isArray(route.path)) {
              route.path.forEach(p => {
                if (p.lat && p.lng) {
                  points.push({ latitude: p.lat, longitude: p.lng });
                }
              });
            } else if (route.steps && route.steps.length > 0) {
              route.steps.forEach(step => {
                if (step.location) {
                  points.push({
                    latitude: step.location.lat,
                    longitude: step.location.lng
                  });
                }
              });
            } else {
              console.warn("No route path or steps found to draw polyline.");
            }

            if (points.length > 0) {
              this.setData({
                polyline: [{
                  points: points,
                  color: '#3498db',
                  width: 5,
                  dottedLine: false
                }],
                exerciseRoute: route
              });
            } else {
              wx.showToast({
                title: '无法解析路线信息',
                icon: 'none'
              });
            }
          } else {
            wx.showToast({
              title: '未找到路线',
              icon: 'none'
            });
          }
        } else {
          console.error('Route calculation failed:', res.data);
          wx.showToast({
            title: '计算路线失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('Route request failed:', err);
        wx.showToast({
          title: '网络错误，无法计算路线',
          icon: 'none'
        });
      }
    });
  },

  // Itinerary Management Functions
  addItineraryItem() {
    this.setData({
      isAddingItinerary: true,
      editingItineraryItem: null,
      itineraryTitle: '',
      itineraryTime: '',
      itineraryDescription: ''
    });
  },
  editItineraryItem(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.itinerary.find(item => item.id === id);
    if (item) {
      this.setData({
        isAddingItinerary: false,
        editingItineraryItem: item,
        itineraryTitle: item.title,
        itineraryTime: item.time,
        itineraryDescription: item.description
      });
    }
  },
  deleteItineraryItem(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除行程项',
      content: '确定要删除此行程项吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            itinerary: this.data.itinerary.filter(item => item.id !== id)
          });
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },
  onItineraryTitleChange(e) {
    this.setData({ itineraryTitle: e.detail.value });
  },
  onItineraryTimeChange(e) {
    this.setData({ itineraryTime: e.detail.value });
  },
  onItineraryDescriptionChange(e) {
    this.setData({ itineraryDescription: e.detail.value });
  },
  confirmItineraryItem() {
    const { itinerary, editingItineraryItem, itineraryTitle, itineraryTime, itineraryDescription } = this.data;
    
    if (!itineraryTitle || !itineraryTime || !itineraryDescription) {
      wx.showToast({ title: '请填写所有行程信息', icon: 'none' });
      return;
    }

    const newItem = {
      id: editingItineraryItem ? editingItineraryItem.id : Date.now().toString(),
      title: itineraryTitle,
      time: itineraryTime,
      description: itineraryDescription
    };

    let updatedItinerary;
    if (editingItineraryItem) {
      updatedItinerary = itinerary.map(item => item.id === newItem.id ? newItem : item);
    } else {
      updatedItinerary = itinerary.concat(newItem);
    }

    this.setData({
      itinerary: updatedItinerary,
      isAddingItinerary: false,
      editingItineraryItem: null,
      itineraryTitle: '',
      itineraryTime: '',
      itineraryDescription: ''
    });
    wx.showToast({ title: editingItineraryItem ? '行程已更新' : '行程已添加', icon: 'success' });
  },
  cancelItineraryEdit() {
    this.setData({
      isAddingItinerary: false,
      editingItineraryItem: null,
      itineraryTitle: '',
      itineraryTime: '',
      itineraryDescription: ''
    });
  },

  // Save Travel Plan
  saveTravelPlan() {
    const travelPlan = {
      destination: this.data.destination,
      startDate: this.data.startDate,
      endDate: this.data.endDate,
      itinerary: this.data.itinerary,
      startLocation: this.data.startLocation,
      endLocation: this.data.endLocation,
      exerciseRoute: this.data.exerciseRoute,
      latitude: this.data.latitude, // Save current map state
      longitude: this.data.longitude,
      markers: this.data.markers,
      polyline: this.data.polyline,
      createdAt: new Date().toISOString()
    };
    console.log('Saving travel plan:', travelPlan);
    wx.setStorageSync('lastTravelPlan', travelPlan);
    wx.showToast({
      title: '行程已保存',
      icon: 'success',
      duration: 2000
    });
  },

  // Reset Form
  resetTravelForm() {
    this.setData({
      destination: '',
      startDate: '',
      endDate: '',
      itinerary: [],
      latitude: 39.9042,
      longitude: 116.4074,
      markers: [{
        id: 1,
        latitude: 39.9042,
        longitude: 116.4074,
        title: '默认位置',
        iconPath: '/images/marker.png',
        width: 30,
        height: 30
      }],
      polyline: [],
      startLocation: '',
      endLocation: '',
      exerciseRoute: null,
      currentLocation: null,
      trackingInterval: null,
      isAddingItinerary: false,
      editingItineraryItem: null,
      itineraryTitle: '',
      itineraryTime: '',
      itineraryDescription: '',
      showTravelSection: false, // Hide travel section on reset
      showExerciseSection: false // Hide exercise section on reset
    });
    this.stopLocationTracking();
    this.startLocationTracking();
    wx.showToast({ title: '表单已重置', icon: 'none' });
  },

  // --- Exercise Record Functions ---
  // TODO: Implement exercise record functions here.
});
