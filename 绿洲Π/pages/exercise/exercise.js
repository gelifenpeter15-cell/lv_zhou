Page({
  data: {
    exerciseLogs: [], // Array to store daily exercise logs
    exerciseType: '', // To store the input for exercise type
    duration: '',     // To store the input for duration
    intensity: ''     // To store the input for intensity
  },
  onLoad: function() {
    // Simplified onLoad for the exercise page
  },

  // Input handlers for exercise logging
  onExerciseTypeInput(e) {
    this.setData({
      exerciseType: e.detail.value
    });
  },
  onDurationInput(e) {
    this.setData({
      duration: e.detail.value
    });
  },
  onIntensityInput(e) {
    this.setData({
      intensity: e.detail.value
    });
  },

  // Function to add a new exercise log
  addExerciseLog() {
    const { exerciseType, duration, intensity, exerciseLogs } = this.data;

    // Basic validation
    if (!exerciseType || !duration || !intensity) {
      wx.showToast({
        title: '请填写所有字段',
        icon: 'none',
        duration: 1500
      });
      return;
    }

    const newLog = {
      id: Date.now(), // Unique ID for the log
      date: new Date().toLocaleDateString(), // Current date
      type: exerciseType,
      duration: duration,
      intensity: intensity
    };
    
    // Directly push to the existing array and then update data.
    // This modification aims to avoid the spread syntax which might be causing the Babel error.
    exerciseLogs.push(newLog); 
    
    this.setData({
      exerciseLogs: exerciseLogs, // Update with the modified array
      // Clear the input fields after adding the log
      exerciseType: '',
      duration: '',
      intensity: ''
    });
    
    // Show success message
    wx.showToast({
      title: '运动记录已添加',
      icon: 'success',
      duration: 1500
    });
  },

  // Function to delete an exercise log
  deleteExerciseLog(e) {
    const logIdToDelete = e.currentTarget.dataset.id;
    const { exerciseLogs } = this.data;

    // Filter out the log with the matching ID
    const updatedLogs = exerciseLogs.filter(log => log.id !== logIdToDelete);
    
    this.setData({
      exerciseLogs: updatedLogs
    });

    wx.showToast({
      title: '记录已删除',
      icon: 'success',
      duration: 1500
    });
  }
});
