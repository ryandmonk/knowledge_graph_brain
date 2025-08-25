export interface MCPServerConfig {
  orchestratorUrl: string;
  sessionTimeoutMs?: number;
}

export interface SessionContext {
  currentKnowledgeBase?: string;
  lastActivity: number;
  queryHistory: Array<{
    timestamp: number;
    tool: string;
    query: string;
    kb_id: string;
    resultCount: number;
  }>;
}

/**
 * Session management for maintaining context across tool calls
 */
export class SessionManager {
  private sessions = new Map<string, SessionContext>();

  getSession(sessionId: string): SessionContext {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        queryHistory: [],
        lastActivity: Date.now(),
      });
    }
    
    // Update activity timestamp
    const session = this.sessions.get(sessionId)!;
    session.lastActivity = Date.now();
    return session;
  }

  updateSession(sessionId: string, updates: Partial<SessionContext>) {
    const session = this.getSession(sessionId);
    Object.assign(session, updates, { lastActivity: Date.now() });
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getActiveSessions(): number {
    return this.sessions.size;
  }

  getTotalSessions(): number {
    return this.sessions.size; // In a real implementation, this would track all-time sessions
  }

  cleanupOldSessions(maxAgeMs: number = 30 * 60 * 1000) { // 30 minutes default
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > maxAgeMs) {
        this.sessions.delete(sessionId);
      }
    }
  }
}
