import React, { useState, useEffect } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';

const ExcalidrawViewer = ({ initialData }) => {
    const [showExcalidraw, setShowExcalidraw] = useState(false);

    useEffect(() => {
        setShowExcalidraw(true);
    }, []);

    if (!showExcalidraw) {
        return <div>Loading...</div>;
    }

    return (
        <div style={{ height: '100vh', width: '100%' }}>
            <Excalidraw initialData={initialData} theme={"dark"} viewModeEnabled={true} />
        </div>
    );
};

export default ExcalidrawViewer;
