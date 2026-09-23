// 관리 페이지
import React from "react";

import ManagementDevices from './managements/ManagementDevices';
import ManagementLocations from './managements/ManagementLocations';
import ManagementSettings from './managements/ManagementSettings';
import ManagementUesrs from './managements/ManagementUesrs';

const Management = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <ManagementLocations />
            <ManagementDevices />
            <ManagementUesrs />
            <ManagementSettings />
        </div >
    );
};

export default Management;