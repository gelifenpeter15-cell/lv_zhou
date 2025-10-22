Page({
  data: {
    exerciseType: '',
    duration: '',
    distance: '',
    notes: ''
  },
  onTypeChange(e) {
    this.setData({
      exerciseType: e.detail.value
    });
  },
  onDurationChange(e) {
    this.setData({
      duration: e.detail.value
    });
  },
  onDistanceChange(e) {
    this.setData({
      distance: e.detail.value
    });
  },
  onNotesChange(e) {
    this.setData({
      notes: e.detail.value
    });
  },
  saveExercise() {
    const exerciseData = {
      type: this.data.exerciseType,
      duration: this.data.duration,
      distance: this.data.distance,
      notes: this.data.notes,
      timestamp: new Date().toISOString()
    };
    console.log('Saving exercise data:', exerciseData);
    // In a real application, you would save this data to storage or a backend.
    // For now, we'll just log it and navigate back.
    wx.showToast({
      title: '运动已记录',
      icon: 'success',
      duration: 2000
    });
    wx.navigateBack({
      delta: 1 // Go back one page
    });
  }
})
