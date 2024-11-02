class AlgorithmService {
  generateFeed(userId, winds, following) {
    const userLikes = winds
      .filter(wind => wind.likes.includes(userId))
      .map(wind => wind.userId);
    
    const relevantWinds = winds.filter(wind => 
      following.includes(wind.userId) || 
      userLikes.includes(wind.userId) ||
      wind.userId === userId
    );
    
    return relevantWinds.sort((a, b) => {
      const scoreA = this.calculateWindScore(a, userId, following);
      const scoreB = this.calculateWindScore(b, userId, following);
      return scoreB - scoreA;
    });
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  calculateWindScore(wind, userId, following, userLocation, windUserLocation) {
    const timeWeight = 1.0;
    const likeWeight = 0.5;
    const followWeight = 2.0;
    const selfWeight = 3.0;
    const locationWeight = 2.5;

    const ageInHours = (new Date() - new Date(wind.timestamp)) / (1000 * 60 * 60);
    const timeScore = 1 / (1 + ageInHours);
    
    const likeScore = wind.likes.length / 100;
    const isFollowed = following.includes(wind.userId) ? 1 : 0;
    const isSelf = wind.userId === userId ? 1 : 0;

    let locationScore = 0;
    if (userLocation && windUserLocation) {
        const distance = this.calculateDistance(
            userLocation.lat, userLocation.lon,
            windUserLocation.lat, windUserLocation.lon
        );
        locationScore = Math.exp(-distance / 1000); // Exponential decay based on distance
    }

    return (timeScore * timeWeight) + 
           (likeScore * likeWeight) + 
           (isFollowed * followWeight) +
           (isSelf * selfWeight) +
           (locationScore * locationWeight);
  }
}

module.exports = new AlgorithmService();