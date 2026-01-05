import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Incident {
    id?: string;
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    file: string;
    line?: number;
    description: string;
    recommendation: string;
    detected_at: string;
    resolved: boolean;
    resolved_at?: string;
}

export interface MemoryEntry {
    key: string;
    value: any;
    created_at: string;
    updated_at: string;
}

export class MemoryStore {
    private supabase: SupabaseClient | null = null;
    private localMemory: Map<string, Incident[]> = new Map();
    private isConnected = false;

    constructor() {
        this.initSupabase();
    }

    private initSupabase(): void {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (url && key) {
            try {
                this.supabase = createClient(url, key);
                this.isConnected = true;
                console.log('📦 Ultra ACE: Connected to Supabase memory store');
            } catch (error) {
                console.log('📦 Ultra ACE: Using local memory (Supabase not configured)');
            }
        } else {
            console.log('📦 Ultra ACE: Using local memory (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for persistence)');
        }
    }

    async storeIncident(incident: Incident): Promise<void> {
        if (this.supabase && this.isConnected) {
            try {
                const { error } = await this.supabase
                    .from('ultra_ace_incidents')
                    .insert(incident);

                if (error) {
                    console.error('Supabase insert error:', error.message);
                    this.storeLocally(incident);
                }
            } catch {
                this.storeLocally(incident);
            }
        } else {
            this.storeLocally(incident);
        }
    }

    private storeLocally(incident: Incident): void {
        const key = `${incident.file}:${incident.type}`;
        const existing = this.localMemory.get(key) || [];
        existing.push(incident);
        this.localMemory.set(key, existing);
    }

    async getRecentIncidents(limit = 50): Promise<Incident[]> {
        if (this.supabase && this.isConnected) {
            try {
                const { data, error } = await this.supabase
                    .from('ultra_ace_incidents')
                    .select('*')
                    .order('detected_at', { ascending: false })
                    .limit(limit);

                if (error) throw error;
                return data || [];
            } catch {
                return this.getLocalIncidents(limit);
            }
        }
        return this.getLocalIncidents(limit);
    }

    private getLocalIncidents(limit: number): Incident[] {
        const allIncidents: Incident[] = [];
        this.localMemory.forEach(incidents => {
            allIncidents.push(...incidents);
        });
        return allIncidents
            .sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime())
            .slice(0, limit);
    }

    async getIncidentsByType(type: string): Promise<Incident[]> {
        if (this.supabase && this.isConnected) {
            try {
                const { data, error } = await this.supabase
                    .from('ultra_ace_incidents')
                    .select('*')
                    .eq('type', type)
                    .order('detected_at', { ascending: false });

                if (error) throw error;
                return data || [];
            } catch {
                return [];
            }
        }

        const allIncidents: Incident[] = [];
        this.localMemory.forEach(incidents => {
            allIncidents.push(...incidents.filter(i => i.type === type));
        });
        return allIncidents;
    }

    async markResolved(incidentId: string): Promise<void> {
        if (this.supabase && this.isConnected) {
            try {
                await this.supabase
                    .from('ultra_ace_incidents')
                    .update({ resolved: true, resolved_at: new Date().toISOString() })
                    .eq('id', incidentId);
            } catch (error) {
                console.error('Failed to mark incident resolved:', error);
            }
        }
    }

    async getStats(): Promise<{
        total: number;
        bySeverity: Record<string, number>;
        byType: Record<string, number>;
        unresolvedCount: number;
    }> {
        const incidents = await this.getRecentIncidents(1000);

        const bySeverity: Record<string, number> = {};
        const byType: Record<string, number> = {};
        let unresolvedCount = 0;

        incidents.forEach(incident => {
            bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1;
            byType[incident.type] = (byType[incident.type] || 0) + 1;
            if (!incident.resolved) unresolvedCount++;
        });

        return {
            total: incidents.length,
            bySeverity,
            byType,
            unresolvedCount,
        };
    }
}
