Page({
  data: {
    // Travel Plan Data
    destination: '',
    startDate: '',
    endDate: '',
    itinerary: [],
    latitude: 0,
    longitude: 0,
    markers: [],
    polyline: [],
    startLocation: '',
    endLocation: '',
    exerciseRoute: null,
    currentLocation: null,
    trackingInterval: null,
    mapContext: null,
    editingItineraryItem: null,
    isAddingItinerary: false,
    itineraryTitle: '',
    itineraryTime: '',
    itineraryDescription: '',
  },

  onLoad: function(options) {
    // Load saved travel plan if it exists
    const savedTravelPlan = wx.getStorageSync('lastTravelPlan');
    if (savedTravelPlan) {
      this.setData({
        destination: savedTravelPlan.destination || '',
        startDate: savedTravelPlan.startDate || '',
        endDate: savedTravelPlan.endDate || '',
        itinerary: savedTravelPlan.itinerary || [],
        startLocation: savedTravelPlan.startLocation || '',
        endLocation: savedTravelPlan.endLocation || '',
        exerciseRoute: savedTravelPlan.exerciseRoute || null,
        // Re-initialize map data and start tracking.
        // If saved plan has coordinates, use them. Otherwise, use default.
        latitude: savedTravelPlan.latitude || 39.9042,
        longitude: savedTravelPlan.longitude || 116.4074,
        markers: savedTravelPlan.markers || [{
          id: 1,
          latitude: savedTravelPlan.latitude || 39.9042,
          longitude: savedTravelPlan.longitude || 116.4074,
          title: savedTravelPlan.destination || '默认位置',
          iconPath: '/images/marker.png',
          width: 30,
          height: 30
        }],
        polyline: savedTravelPlan.polyline || []
      });
    } else {
      // Default map center if no saved plan
      const defaultDestination = '北京'; // Set a default destination
      this.setData({
        destination: defaultDestination,
        latitude: 39.9042,
        longitude: 116.4074,
        markers: [{
          id: 1,
          latitude: 39.9042,
          longitude: 116.4074,
          title: defaultDestination,
          iconPath: '/images/marker.png',
          width: 30,
          height: 30
        }]
      });
    }
    // Ensure map context is set and map moves to location after initial data is set
    this.onReady(); 
  },

  onShow: function() {
    // Optional: Re-check or refresh user info if needed.
  },

  onReady: function() {
    // Get map context after the map component is ready
    this.setData({
      mapContext: wx.createMapContext('travelMap')
    });
    // Try to move the map to the current location or default location
    if (this.data.mapContext) {
      if (this.data.currentLocation) {
        this.data.mapContext.moveToLocation({
          latitude: this.data.currentLocation.latitude,
          longitude: this.data.currentLocation.longitude,
          duration: 100
        });
      } else {
        this.data.mapContext.moveToLocation({
          latitude: this.data.latitude,
          longitude: this.data.longitude,
          duration: 100
        });
      }
    }
  },

  onUnload: function() {
    // Stop tracking location when the page is unloaded to prevent memory leaks
    this.stopLocationTracking();
  },

  // --- Map Interaction ---
  onMapTap(e) {
    const latitude = e.detail.latitude;
    const longitude = e.detail.longitude;

    this.setData({
      latitude: latitude,
      longitude: longitude,
    });

    // Filter out existing destination/start/end markers, keep current location marker
    const filteredMarkers = this.data.markers.filter(marker => marker.title === '当前位置');
    
    // Add a new marker for the tapped location
    const newMarker = {
      id: Date.now(), // Unique ID
      latitude: latitude,
      longitude: longitude,
      title: '新目的地', // Placeholder title
      iconPath: '/images/marker.png', // Default marker icon
      width: 30,
      height: 30
    };
    
    this.setData({
      markers: [...filteredMarkers, newMarker]
    });

    // Perform reverse geocoding to get the address
    this.reverseGeocode(latitude, longitude);

    // Move map to the tapped location
    if (this.data.mapContext) {
      this.data.mapContext.moveToLocation({
        latitude: latitude,
        longitude: longitude,
        duration: 100
      });
    }
  },

  // Reverse Geocoding function
  reverseGeocode(latitude, longitude) {
    const ak = '8lko9fieCjdGAGgYYxJToXGth7WLyUkV'; // Baidu Maps AK from project.private.config.json
    if (!ak || ak === 'YOUR_BAIDU_MAPS_AK') {
      console.warn('Baidu Maps AK is not set. Reverse geocoding will not work.');
      wx.showToast({ title: '地图服务未配置', icon: 'none' });
      return;
    }
    const reverseGeocodeUrl = `https://api.map.baidu.com/geocoder/v2/?location=${latitude},${longitude}&output=json&ak=${ak}`;

    wx.request({
      url: reverseGeocodeUrl,
      success: (res) => {
        if (res.data && res.data.status === 0) {
          const address = res.data.result.formatted_address;
          this.setData({
            destination: address, // Update destination input
            markers: this.data.markers.map(marker => {
              if (marker.title === '新目的地') {
                return {
                  ...marker,
                  title: address // Update marker title with the address
                };
              }
              return marker;
            })
          });
          wx.showToast({ title: `已选择: ${address}`, icon: 'none' });
        } else {
          console.error('Reverse geocoding failed:', res.data);
          wx.showToast({
            title: '无法获取地址信息',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('Reverse geocode request failed:', err);
        wx.showToast({
          title: '网络错误，无法获取地址信息',
          icon: 'none'
        });
      }
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
      // If input is cleared, reset to default or clear map markers
      const defaultDestination = '北京'; // Set a default destination
      this.setData({
        destination: defaultDestination,
        latitude: 39.9042,
        longitude: 116.4074,
        markers: [{
          id: 1,
          latitude: 39.9042,
          longitude: 116.4074,
          title: defaultDestination,
          iconPath: '/images/marker.png',
          width: 30,
          height: 30
        }]
      });
      this.getCoordinates(defaultDestination); // Call getCoordinates for the default destination
    }
    // Removed the options.destination check as it's less relevant for map tap interaction
    this.startLocationTracking(); // Keep tracking location if destination changes
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

  // Geocoding function (for input address to coordinates)
  getCoordinates(address) {
    const ak = '8lko9fieCjdGAGgYYxJToXGth7WLyUkV'; // Baidu Maps AK from project.private.config.json
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
          // Update map center and markers based on geocoded address
          this.setData({
            latitude: location.lat,
            longitude: location.lng,
            markers: [{ // Replace existing markers with the new destination marker
              id: Date.now(),
              latitude: location.lat,
              longitude: location.lng,
              title: address,
              iconPath: '/images/marker.png',
              width: 30,
              height: 30
            }],
            polyline: [] // Clear polyline when destination changes
          });
          // Move map to the new location
          if (this.data.mapContext) {
            this.data.mapContext.moveToLocation({
              latitude: location.lat,
              longitude: location.lng,
              duration: 100
            });
          }
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
    // Check if location permission is already granted or prompt user
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.userLocation']) {
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => {
              this.getLocationAndStartTracking();
            },
            fail: () => {
              console.error('User denied location permission.');
              wx.showToast({ title: '请开启位置权限', icon: 'none' });
            }
          });
        } else {
          this.getLocationAndStartTracking();
        }
      }
    });
  },

  getLocationAndStartTracking() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const currentLocation = {
          latitude: res.latitude,
          longitude: res.longitude
        };
        this.setData({
          currentLocation: currentLocation,
          // Update map center to current location if no destination is set yet
          latitude: this.data.destination ? this.data.latitude : currentLocation.latitude,
          longitude: this.data.destination ? this.data.longitude : currentLocation.longitude,
          markers: this.data.markers.filter(m => m.title !== '当前位置').concat([{ // Add current location marker, ensuring no duplicates
            id: Date.now(),
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            title: '当前位置',
            iconPath: '/images/current_location_marker.png', // Ensure this icon exists
            width: 30,
            height: 30
          }])
        });

        // Move map to current location if it's the primary focus
        if (this.data.mapContext) {
          this.data.mapContext.moveToLocation({
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            duration: 100
          });
        }

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
          // Update latitude/longitude only if they are not set by a destination/tap
          latitude: this.data.destination ? this.data.latitude : currentLocation.latitude,
          longitude: this.data.destination ? this.data.longitude : currentLocation.longitude,
          markers: this.data.markers.map(marker => {
            if (marker.title === '当前位置') {
              return {
                ...marker,
                id: Date.now(), // Update ID to ensure it's fresh
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude
              };
            }
            return marker;
          })
        });
        if (this.data.mapContext) {
          // Only move map if current location is the primary focus (i.e., no destination set)
          if (!this.data.destination) {
            this.data.mapContext.moveToLocation({
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              duration: 100
            });
          }
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
    const ak = '8lko9fieCjdGAGgYYxJToXGth7WLyUkV'; // Baidu Maps AK from project.private.config.json
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
          latitude: startCoords.lat, // Center map on start location
          longitude: startCoords.lng,
          markers: [
            // Keep current location marker if it exists
            ...(this.data.markers.filter(m => m.title === '当前位置')),
            {
              id: Date.now() + 1,
              latitude: startCoords.lat,
              longitude: startCoords.lng,
              title: startLocation,
              iconPath: '/images/start_marker.png', // Ensure these icons exist
              width: 30,
              height: 30
            },
            {
              id: Date.now() + 2,
              latitude: endCoords.lat,
              longitude: endCoords.lng,
              title: endLocation,
              iconPath: '/images/end_marker.png', // Ensure these icons exist
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
    const ak = '8lko9fieCjdGAGgYYxJToXGth7WLyUkV'; // Baidu Maps AK from project.private.config.json
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
    });
    this.stopLocationTracking();
    // Re-initialize map and start tracking after reset
    this.onLoad(); // Re-run onLoad to reset map context and potentially start tracking
    wx.showToast({ title: '表单已重置', icon: 'none' });
  },
});
