# 07 - Data Storage & Feedback System

## Overview

This document outlines the client-side data storage strategy for the Screenshot Import Assistant, including user corrections, performance data, and feedback collection. All storage is local to comply with the static site requirement.

## Storage Architecture

```
Client-Side Storage
├── IndexedDB (Primary Storage)
│   ├── Corrections Database
│   ├── Performance Metrics
│   └── Template Cache
├── LocalStorage (Settings)
│   ├── User Preferences
│   ├── Feature Flags
│   └── Configuration
└── SessionStorage (Temporary)
    ├── Current Session Data
    ├── Upload State
    └── Processing Cache
```

## IndexedDB Schema

### Database Structure
```javascript
// storage/schema.js
export const DB_CONFIG = {
  name: 'ScreenshotImportDB',
  version: 1,
  stores: {
    corrections: {
      keyPath: 'id',
      autoIncrement: true,
      indexes: {
        imageHash: { unique: false },
        timestamp: { unique: false },
        upgradeId: { unique: false }
      }
    },
    performance: {
      keyPath: 'id',
      autoIncrement: true,
      indexes: {
        sessionId: { unique: false },
        timestamp: { unique: false }
      }
    },
    templates: {
      keyPath: 'upgradeId',
      indexes: {
        category: { unique: false },
        lastAccessed: { unique: false }
      }
    },
    sessions: {
      keyPath: 'sessionId',
      indexes: {
        timestamp: { unique: false },
        status: { unique: false }
      }
    }
  }
};

// Data Models
export const DataModels = {
  Correction: {
    id: null,                    // Auto-generated
    sessionId: '',               // Session identifier
    imageHash: '',               // Hash of processed image
    originalPosition: { x: 0, y: 0 }, // Position in screenshot
    originalUpgradeId: '',       // AI's guess
    correctedUpgradeId: '',      // User's correction
    confidence: 0,               // Original confidence
    timestamp: new Date(),
    userAgent: navigator.userAgent
  },
  
  PerformanceMetric: {
    id: null,
    sessionId: '',
    phase: '',                   // 'processing', 'recognition', etc.
    duration: 0,                 // milliseconds
    memory: 0,                   // bytes
    imageSize: { width: 0, height: 0 },
    hexagonCount: 0,
    timestamp: new Date()
  },
  
  TemplateCache: {
    upgradeId: '',
    templateData: null,          // Cached processed template
    features: null,              // Extracted features
    hash: '',
    lastAccessed: new Date(),
    hitCount: 0
  },
  
  Session: {
    sessionId: '',
    startTime: new Date(),
    endTime: null,
    status: 'active',            // 'active', 'completed', 'error'
    imageInfo: {
      size: { width: 0, height: 0 },
      fileSize: 0,
      format: ''
    },
    results: {
      totalHexagons: 0,
      recognizedHexagons: 0,
      correctionsMade: 0,
      processingTime: 0
    },
    errors: []
  }
};
```

## Storage Manager Implementation

### Core Storage Manager
```javascript
// storage/storage-manager.js
export class StorageManager {
  constructor() {
    this.db = null;
    this.dbName = DB_CONFIG.name;
    this.version = DB_CONFIG.version;
    this.initialized = false;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        console.log('StorageManager initialized');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this.createStores(db);
      };
    });
  }

  createStores(db) {
    // Create corrections store
    if (!db.objectStoreNames.contains('corrections')) {
      const correctionsStore = db.createObjectStore('corrections', {
        keyPath: 'id',
        autoIncrement: true
      });
      
      correctionsStore.createIndex('imageHash', 'imageHash', { unique: false });
      correctionsStore.createIndex('timestamp', 'timestamp', { unique: false });
      correctionsStore.createIndex('upgradeId', 'correctedUpgradeId', { unique: false });
    }
    
    // Create performance store
    if (!db.objectStoreNames.contains('performance')) {
      const performanceStore = db.createObjectStore('performance', {
        keyPath: 'id',
        autoIncrement: true
      });
      
      performanceStore.createIndex('sessionId', 'sessionId', { unique: false });
      performanceStore.createIndex('timestamp', 'timestamp', { unique: false });
    }
    
    // Create templates cache store
    if (!db.objectStoreNames.contains('templates')) {
      const templatesStore = db.createObjectStore('templates', {
        keyPath: 'upgradeId'
      });
      
      templatesStore.createIndex('category', 'category', { unique: false });
      templatesStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
    }
    
    // Create sessions store
    if (!db.objectStoreNames.contains('sessions')) {
      const sessionsStore = db.createObjectStore('sessions', {
        keyPath: 'sessionId'
      });
      
      sessionsStore.createIndex('timestamp', 'startTime', { unique: false });
      sessionsStore.createIndex('status', 'status', { unique: false });
    }
  }

  async saveCorrection(correction) {
    if (!this.initialized) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['corrections'], 'readwrite');
      const store = transaction.objectStore('corrections');
      
      const request = store.add({
        ...correction,
        timestamp: new Date()
      });
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getCorrections(filters = {}) {
    if (!this.initialized) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['corrections'], 'readonly');
      const store = transaction.objectStore('corrections');
      
      let request;
      
      if (filters.imageHash) {
        const index = store.index('imageHash');
        request = index.getAll(filters.imageHash);
      } else if (filters.upgradeId) {
        const index = store.index('upgradeId');
        request = index.getAll(filters.upgradeId);
      } else {
        request = store.getAll();
      }
      
      request.onsuccess = () => {
        let results = request.result;
        
        // Apply additional filters
        if (filters.since) {
          results = results.filter(c => c.timestamp >= filters.since);
        }
        
        if (filters.limit) {
          results = results.slice(0, filters.limit);
        }
        
        resolve(results);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async savePerformanceMetric(metric) {
    if (!this.initialized) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['performance'], 'readwrite');
      const store = transaction.objectStore('performance');
      
      const request = store.add({
        ...metric,
        timestamp: new Date()
      });
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSession(session) {
    if (!this.initialized) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');
      
      const request = store.put(session);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getSession(sessionId) {
    if (!this.initialized) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sessions'], 'readonly');
      const store = transaction.objectStore('sessions');
      
      const request = store.get(sessionId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async cacheTemplate(upgradeId, templateData) {
    if (!this.initialized) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['templates'], 'readwrite');
      const store = transaction.objectStore('templates');
      
      const cacheEntry = {
        upgradeId,
        templateData,
        lastAccessed: new Date(),
        hitCount: 1
      };
      
      const request = store.put(cacheEntry);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedTemplate(upgradeId) {
    if (!this.initialized) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['templates'], 'readwrite');
      const store = transaction.objectStore('templates');
      
      const request = store.get(upgradeId);
      
      request.onsuccess = () => {
        const result = request.result;
        
        if (result) {
          // Update access info
          result.lastAccessed = new Date();
          result.hitCount += 1;
          store.put(result);
        }
        
        resolve(result);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async clearOldData(daysToKeep = 30) {
    if (!this.initialized) await this.initialize();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const stores = ['corrections', 'performance', 'sessions'];
    const transaction = this.db.transaction(stores, 'readwrite');
    
    for (const storeName of stores) {
      const store = transaction.objectStore(storeName);
      const index = store.index('timestamp');
      
      const range = IDBKeyRange.upperBound(cutoffDate);
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    }
  }
}
```

## Session Management

### Session Tracker
```javascript
// storage/session-tracker.js
export class SessionTracker {
  constructor(storageManager) {
    this.storage = storageManager;
    this.currentSession = null;
    this.startTime = null;
    this.metrics = [];
  }

  startSession(imageInfo) {
    this.currentSession = {
      sessionId: this.generateSessionId(),
      startTime: new Date(),
      endTime: null,
      status: 'active',
      imageInfo: {
        size: imageInfo.size,
        fileSize: imageInfo.fileSize,
        format: imageInfo.format
      },
      results: {
        totalHexagons: 0,
        recognizedHexagons: 0,
        correctionsMade: 0,
        processingTime: 0
      },
      errors: []
    };
    
    this.startTime = performance.now();
    this.storage.saveSession(this.currentSession);
    
    console.log(`Session started: ${this.currentSession.sessionId}`);
    return this.currentSession.sessionId;
  }

  updateSession(updates) {
    if (!this.currentSession) return;
    
    Object.assign(this.currentSession, updates);
    this.storage.saveSession(this.currentSession);
  }

  recordMetric(phase, data) {
    if (!this.currentSession) return;
    
    const metric = {
      sessionId: this.currentSession.sessionId,
      phase,
      duration: data.duration || 0,
      memory: this.getMemoryUsage(),
      imageSize: this.currentSession.imageInfo.size,
      hexagonCount: data.hexagonCount || 0,
      ...data
    };
    
    this.metrics.push(metric);
    this.storage.savePerformanceMetric(metric);
  }

  recordError(error, phase) {
    if (!this.currentSession) return;
    
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      phase,
      timestamp: new Date()
    };
    
    this.currentSession.errors.push(errorInfo);
    this.updateSession({ status: 'error' });
  }

  recordCorrection(correction) {
    if (!this.currentSession) return;
    
    // Add session ID to correction
    const correctionWithSession = {
      ...correction,
      sessionId: this.currentSession.sessionId
    };
    
    this.storage.saveCorrection(correctionWithSession);
    
    // Update session stats
    this.currentSession.results.correctionsMade += 1;
    this.updateSession(this.currentSession);
  }

  endSession(results) {
    if (!this.currentSession) return;
    
    const endTime = performance.now();
    const totalTime = endTime - this.startTime;
    
    this.currentSession.endTime = new Date();
    this.currentSession.status = 'completed';
    this.currentSession.results = {
      ...this.currentSession.results,
      ...results,
      processingTime: totalTime
    };
    
    this.storage.saveSession(this.currentSession);
    
    console.log(`Session completed: ${this.currentSession.sessionId}`);
    console.log(`Total time: ${(totalTime / 1000).toFixed(2)}s`);
    
    const sessionId = this.currentSession.sessionId;
    this.currentSession = null;
    this.startTime = null;
    this.metrics = [];
    
    return sessionId;
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }
}
```

## Feedback Collection System

### Feedback Collector
```javascript
// storage/feedback-collector.js
export class FeedbackCollector {
  constructor(storageManager) {
    this.storage = storageManager;
  }

  async generateFeedbackReport(sessionId) {
    // Get session data
    const session = await this.storage.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Get corrections for this session
    const corrections = await this.storage.getCorrections({
      sessionId: sessionId
    });
    
    // Get performance metrics
    const metrics = await this.storage.getPerformanceMetrics(sessionId);
    
    // Generate anonymized report
    const report = this.createAnonymizedReport(session, corrections, metrics);
    
    return report;
  }

  createAnonymizedReport(session, corrections, metrics) {
    // Remove identifying information
    const anonymizedSession = {
      imageSize: session.imageInfo.size,
      fileSize: Math.round(session.imageInfo.fileSize / 1024), // KB
      format: session.imageInfo.format,
      processingTime: Math.round(session.results.processingTime),
      totalHexagons: session.results.totalHexagons,
      recognizedHexagons: session.results.recognizedHexagons,
      correctionsMade: session.results.correctionsMade,
      errors: session.errors.map(e => ({
        phase: e.phase,
        message: e.message.substring(0, 100) // Truncate
      }))
    };
    
    const anonymizedCorrections = corrections.map(c => ({
      originalUpgradeId: c.originalUpgradeId,
      correctedUpgradeId: c.correctedUpgradeId,
      confidence: Math.round(c.confidence * 100) / 100,
      position: {
        x: Math.round(c.originalPosition.x / 10) * 10, // Rounded
        y: Math.round(c.originalPosition.y / 10) * 10
      }
    }));
    
    const performanceSummary = this.summarizeMetrics(metrics);
    
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      browser: this.getBrowserInfo(),
      session: anonymizedSession,
      corrections: anonymizedCorrections,
      performance: performanceSummary
    };
  }

  summarizeMetrics(metrics) {
    if (!metrics || metrics.length === 0) return null;
    
    const phases = {};
    
    metrics.forEach(metric => {
      if (!phases[metric.phase]) {
        phases[metric.phase] = {
          count: 0,
          totalDuration: 0,
          avgDuration: 0
        };
      }
      
      phases[metric.phase].count += 1;
      phases[metric.phase].totalDuration += metric.duration;
    });
    
    // Calculate averages
    Object.keys(phases).forEach(phase => {
      phases[phase].avgDuration = Math.round(
        phases[phase].totalDuration / phases[phase].count
      );
      delete phases[phase].totalDuration; // Remove raw total
    });
    
    return phases;
  }

  getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    
    return {
      name: browser,
      mobile: /Mobile|Android|iPhone|iPad/.test(ua),
      canvas: !!document.createElement('canvas').getContext,
      webgl: !!document.createElement('canvas').getContext('webgl'),
      indexedDB: !!window.indexedDB
    };
  }

  generateGitHubIssueURL(report) {
    const title = `Screenshot Import Feedback - ${report.corrections.length} corrections`;
    
    const body = `## Automated Feedback Report

### Session Summary
- **Image**: ${report.session.imageSize.width}x${report.session.imageSize.height} (${report.session.fileSize}KB ${report.session.format})
- **Processing Time**: ${(report.session.processingTime / 1000).toFixed(2)}s
- **Hexagons**: ${report.session.recognizedHexagons}/${report.session.totalHexagons} recognized
- **Corrections**: ${report.session.correctionsMade}

### Corrections Made
${report.corrections.map(c => 
  `- **${c.originalUpgradeId}** → **${c.correctedUpgradeId}** (confidence: ${(c.confidence * 100).toFixed(0)}%)`
).join('\n')}

### Performance
${Object.entries(report.performance || {}).map(([phase, data]) =>
  `- **${phase}**: ${data.avgDuration}ms avg (${data.count} samples)`
).join('\n')}

### Technical Details
- **Browser**: ${report.browser.name} ${report.browser.mobile ? '(Mobile)' : '(Desktop)'}
- **Features**: Canvas: ${report.browser.canvas}, WebGL: ${report.browser.webgl}, IndexedDB: ${report.browser.indexedDB}
- **Timestamp**: ${report.timestamp}

---
*This report was generated automatically and contains no personal information.*`;
    
    const encodedTitle = encodeURIComponent(title);
    const encodedBody = encodeURIComponent(body);
    
    return `https://github.com/YOUR_REPO/issues/new?title=${encodedTitle}&body=${encodedBody}&labels=feedback,automated`;
  }

  async collectAndSubmitFeedback(sessionId) {
    try {
      const report = await this.generateFeedbackReport(sessionId);
      const issueURL = this.generateGitHubIssueURL(report);
      
      // Open in new tab
      window.open(issueURL, '_blank');
      
      return true;
    } catch (error) {
      console.error('Failed to generate feedback:', error);
      return false;
    }
  }
}
```

## Settings Management

### Settings Manager
```javascript
// storage/settings-manager.js
export class SettingsManager {
  constructor() {
    this.prefix = 'screenshot-import-';
    this.defaults = {
      confidenceThreshold: 0.75,
      autoApplyHighConfidence: true,
      showProgressDetails: true,
      enablePerformanceTracking: true,
      maxStorageDays: 30,
      enableFeedbackPrompts: true,
      debugMode: false
    };
  }

  get(key) {
    const value = localStorage.getItem(this.prefix + key);
    if (value === null) {
      return this.defaults[key];
    }
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  set(key, value) {
    localStorage.setItem(this.prefix + key, JSON.stringify(value));
  }

  getAll() {
    const settings = {};
    
    Object.keys(this.defaults).forEach(key => {
      settings[key] = this.get(key);
    });
    
    return settings;
  }

  reset() {
    Object.keys(this.defaults).forEach(key => {
      localStorage.removeItem(this.prefix + key);
    });
  }

  export() {
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      settings: this.getAll()
    };
  }

  import(data) {
    if (data.version !== '1.0') {
      throw new Error('Unsupported settings version');
    }
    
    Object.entries(data.settings).forEach(([key, value]) => {
      if (key in this.defaults) {
        this.set(key, value);
      }
    });
  }
}
```

## Cache Management

### Template Cache Manager
```javascript
// storage/cache-manager.js
export class CacheManager {
  constructor(storageManager) {
    this.storage = storageManager;
    this.memoryCache = new Map();
    this.maxMemoryItems = 100;
  }

  async getTemplate(upgradeId) {
    // Check memory cache first
    if (this.memoryCache.has(upgradeId)) {
      return this.memoryCache.get(upgradeId);
    }
    
    // Check IndexedDB cache
    const cached = await this.storage.getCachedTemplate(upgradeId);
    
    if (cached) {
      // Add to memory cache
      this.addToMemoryCache(upgradeId, cached.templateData);
      return cached.templateData;
    }
    
    return null;
  }

  async setTemplate(upgradeId, templateData) {
    // Store in both caches
    await this.storage.cacheTemplate(upgradeId, templateData);
    this.addToMemoryCache(upgradeId, templateData);
  }

  addToMemoryCache(key, value) {
    // Remove oldest if at capacity
    if (this.memoryCache.size >= this.maxMemoryItems) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    
    this.memoryCache.set(key, value);
  }

  clearMemoryCache() {
    this.memoryCache.clear();
  }

  async clearPersistentCache() {
    if (!this.storage.initialized) await this.storage.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.storage.db.transaction(['templates'], 'readwrite');
      const store = transaction.objectStore('templates');
      
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCacheStats() {
    if (!this.storage.initialized) await this.storage.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.storage.db.transaction(['templates'], 'readonly');
      const store = transaction.objectStore('templates');
      
      const countRequest = store.count();
      
      countRequest.onsuccess = () => {
        resolve({
          persistentItems: countRequest.result,
          memoryItems: this.memoryCache.size,
          maxMemoryItems: this.maxMemoryItems
        });
      };
      
      countRequest.onerror = () => reject(countRequest.error);
    });
  }
}
```

## Integration with Main Application

### Storage Integration
```javascript
// screenshot-import/storage-integration.js
import { StorageManager } from './storage/storage-manager.js';
import { SessionTracker } from './storage/session-tracker.js';
import { FeedbackCollector } from './storage/feedback-collector.js';
import { SettingsManager } from './storage/settings-manager.js';
import { CacheManager } from './storage/cache-manager.js';

export class StorageIntegration {
  constructor() {
    this.storage = new StorageManager();
    this.session = new SessionTracker(this.storage);
    this.feedback = new FeedbackCollector(this.storage);
    this.settings = new SettingsManager();
    this.cache = new CacheManager(this.storage);
    this.initialized = false;
  }

  async initialize() {
    await this.storage.initialize();
    
    // Clean up old data
    await this.storage.clearOldData(this.settings.get('maxStorageDays'));
    
    this.initialized = true;
    console.log('Storage integration initialized');
  }

  startSession(imageInfo) {
    return this.session.startSession(imageInfo);
  }

  recordProcessingMetric(phase, data) {
    this.session.recordMetric(phase, data);
  }

  recordCorrection(correction) {
    this.session.recordCorrection(correction);
  }

  endSession(results) {
    const sessionId = this.session.endSession(results);
    
    // Prompt for feedback if enabled and corrections were made
    if (this.settings.get('enableFeedbackPrompts') && 
        results.correctionsMade > 0) {
      this.promptForFeedback(sessionId);
    }
    
    return sessionId;
  }

  async promptForFeedback(sessionId) {
    // Show feedback prompt after a delay
    setTimeout(() => {
      if (confirm('You made corrections that could help improve recognition. Would you like to submit anonymous feedback?')) {
        this.feedback.collectAndSubmitFeedback(sessionId);
      }
    }, 2000);
  }

  async getTemplate(upgradeId) {
    return await this.cache.getTemplate(upgradeId);
  }

  async setTemplate(upgradeId, templateData) {
    return await this.cache.setTemplate(upgradeId, templateData);
  }

  getSettings() {
    return this.settings.getAll();
  }

  updateSetting(key, value) {
    this.settings.set(key, value);
  }

  async getStorageStats() {
    const cacheStats = await this.cache.getCacheStats();
    const corrections = await this.storage.getCorrections({ limit: 1000 });
    
    return {
      cache: cacheStats,
      corrections: corrections.length,
      storageQuota: await this.getStorageQuota()
    };
  }

  async getStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage,
        available: estimate.quota,
        percentage: Math.round((estimate.usage / estimate.quota) * 100)
      };
    }
    return null;
  }
}
```

## Privacy and Data Management

### Data Privacy
1. **No Personal Information**: All data is anonymous
2. **Local Storage Only**: No data sent to external servers
3. **User Control**: Settings to disable tracking
4. **Automatic Cleanup**: Old data is automatically removed

### GDPR Compliance
```javascript
// storage/privacy-manager.js
export class PrivacyManager {
  static showDataUsageNotice() {
    if (localStorage.getItem('screenshot-import-consent') !== 'true') {
      const consent = confirm(`
This tool stores anonymous usage data locally to improve recognition accuracy.
No personal information is collected.

Data includes:
- Recognition corrections you make
- Processing performance metrics
- Error information

Accept data collection?
      `.trim());
      
      if (consent) {
        localStorage.setItem('screenshot-import-consent', 'true');
        return true;
      } else {
        // Disable all tracking
        localStorage.setItem('screenshot-import-consent', 'false');
        return false;
      }
    }
    
    return localStorage.getItem('screenshot-import-consent') === 'true';
  }

  static clearAllData() {
    // Clear IndexedDB
    indexedDB.deleteDatabase('ScreenshotImportDB');
    
    // Clear localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('screenshot-import-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('screenshot-import-')) {
        sessionStorage.removeItem(key);
      }
    });
    
    console.log('All Screenshot Import data cleared');
  }
}
```

## Maintenance and Monitoring

### Storage Health Check
```javascript
// storage/health-check.js
export class StorageHealthCheck {
  static async run() {
    const results = {
      indexedDB: await this.checkIndexedDB(),
      localStorage: this.checkLocalStorage(),
      quota: await this.checkQuota(),
      performance: await this.checkPerformance()
    };
    
    return results;
  }

  static async checkIndexedDB() {
    try {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('ScreenshotImportDB');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      return { status: 'ok', available: true };
    } catch (error) {
      return { status: 'error', available: false, error: error.message };
    }
  }

  static checkLocalStorage() {
    try {
      const testKey = 'test-' + Date.now();
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return { status: 'ok', available: true };
    } catch (error) {
      return { status: 'error', available: false, error: error.message };
    }
  }

  static async checkQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const percentage = (estimate.usage / estimate.quota) * 100;
      
      return {
        status: percentage > 90 ? 'warning' : 'ok',
        used: estimate.usage,
        available: estimate.quota,
        percentage: Math.round(percentage)
      };
    }
    
    return { status: 'unknown', available: false };
  }

  static async checkPerformance() {
    const start = performance.now();
    
    try {
      // Quick write/read test
      localStorage.setItem('perf-test', 'test');
      localStorage.getItem('perf-test');
      localStorage.removeItem('perf-test');
      
      const duration = performance.now() - start;
      
      return {
        status: duration > 100 ? 'slow' : 'ok',
        duration: Math.round(duration)
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
}
```

## Next Steps

With the data storage system implemented, proceed to:
- Create comprehensive testing strategy (see `08-testing-strategy.md`)
- Implement deployment procedures
- Set up monitoring and analytics