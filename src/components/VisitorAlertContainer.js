/**
 * Visitor Alert Container
 * 
 * Handles visitor-related alerts and state management
 * Uses VisitorService for data
 * 
 * This is the "smart" component that manages visitor logic
 * The actual UI rendering is handled by VisitorArrivalAlert (dumb component)
 */

import React, { useState, useEffect } from 'react';
import visitorService from '../../services/visitorService';
import VisitorArrivalAlert from './VisitorArrivalAlert';

const VisitorAlertContainer = ({ enabled = true }) => {
  const [visitorAlertData, setVisitorAlertData] = useState(null);
  const [visitorAlertVisible, setVisitorAlertVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    console.log('👤 [VisitorAlertContainer] Initializing');

    // Subscribe to visitor updates
    const unsubscribe = visitorService.subscribe((event, data) => {
      console.log(`👤 [VisitorAlertContainer] Event: ${event}`, data);

      if (event === 'pendingAdded' && data) {
        // New pending visitor - show alert
        setVisitorAlertData(data);
        setVisitorAlertVisible(true);
      } else if (event === 'approved' || event === 'rejected' || event === 'checkedOut') {
        // Close alert after action
        setVisitorAlertVisible(false);
        setVisitorAlertData(null);
      }
    });

    return unsubscribe;
  }, [enabled]);

  const handleAlertClose = async (result) => {
    console.log('👤 [VisitorAlertContainer] Alert closed:', result);
    setVisitorAlertVisible(false);
    setVisitorAlertData(null);

    // If action was successful, the service already updated state
    // No need to do anything here - polling will confirm
  };

  if (!enabled || !visitorAlertVisible) return null;

  return (
    <VisitorArrivalAlert
      visible={visitorAlertVisible}
      visitorData={visitorAlertData}
      onClose={handleAlertClose}
    />
  );
};

export default VisitorAlertContainer;
