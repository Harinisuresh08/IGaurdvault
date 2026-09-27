import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDataStore } from "@/stores/dataStore";
import { Shield, Lock, Eye, AlertTriangle, Search, Filter, Mail, Camera, FileText, Smartphone } from "lucide-react";
import { Card, Input, Badge, Button } from "@/components/ui";
import { format } from "date-fns";
import type { SecurityEvent } from "@/types";

function getEventIcon(type: SecurityEvent["event_type"]) {
  switch (type) {
    case "login_success": return Shield;
    case "login_failure": return AlertTriangle;
    case "intruder_detected": return Camera;
    case "vault_item_viewed": return Eye;
    case "vault_item_added": return FileText;
    case "alert_generated": return AlertTriangle;
    case "setting_changed": return Smartphone;
    default: return Shield;
  }
}

function getEventColor(severity: SecurityEvent["severity"]) {
  switch (severity) {
    case "critical": return "#EF4444";
    case "high": return "#F97316";
    case "medium": return "#F59E0B";
    case "low": return "#3B82F6";
    case "info": default: return "#00E5FF";
  }
}

export default function SecurityTimelinePage() {
  const { securityEvents, intruderEvents } = useDataStore();
  const [query, setQuery] = useState("");

  // Merge regular security events with intruder events into a single timeline
  const combinedTimeline = useMemo(() => {
    let timeline: any[] = [...securityEvents];
    
    // Map intruder events to timeline items if they aren't already represented
    intruderEvents.forEach((ie) => {
      // Check if there's already an event for this
      const exists = timeline.find(se => se.metadata?.intruder_id === ie.id);
      if (!exists) {
        timeline.push({
          id: `timeline-${ie.id}`,
          event_type: "intruder_detected",
          title: "Intruder Detected",
          description: ie.ai_explanation,
          severity: ie.threat_level === "critical" ? "critical" : ie.threat_level === "high" ? "high" : "medium",
          created_at: ie.created_at,
          metadata: { ...ie.evidence, intruder_id: ie.id },
          risk_score: ie.risk_score,
          location: ie.location_label,
          device_info: ie.device_name,
        });
      }
    });

    // Sort by date descending
    timeline.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    if (query.trim()) {
      const q = query.toLowerCase();
      timeline = timeline.filter(e => 
        e.title.toLowerCase().includes(q) || 
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.event_type && e.event_type.toLowerCase().includes(q))
      );
    }
    
    return timeline;
  }, [securityEvents, intruderEvents, query]);

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <PageHeader 
        title="Security Timeline" 
        subtitle="Chronological log of all authentication and security events" 
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          placeholder="Search timeline..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          icon={<Search className="w-4 h-4" />}
          className="flex-1"
        />
        <Button variant="secondary" icon={<Filter className="w-4 h-4" />}>
          Filter
        </Button>
      </div>

      <div className="relative border-l border-base-border ml-6 space-y-6">
        <AnimatePresence>
          {combinedTimeline.map((event, i) => {
            const Icon = getEventIcon(event.event_type);
            const color = getEventColor(event.severity);
            const isIntruder = event.event_type === "intruder_detected";
            
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative pl-8"
              >
                {/* Timeline node */}
                <div 
                  className="absolute left-[-16px] top-1 w-8 h-8 rounded-full flex items-center justify-center border-4 border-base-bg"
                  style={{ background: color }}
                >
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                
                <Card className={`p-4 ${isIntruder ? 'border-danger/30 bg-danger/5' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{event.title}</h3>
                      <p className="text-xs text-muted mt-0.5">{format(new Date(event.created_at), "PPpp")}</p>
                    </div>
                    {event.risk_score !== undefined && event.risk_score !== null && (
                      <Badge color={color}>Risk: {event.risk_score}</Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-light mb-3">{event.description}</p>
                  
                  <div className="flex flex-wrap gap-2 text-xs text-muted-faint">
                    {event.location && (
                      <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {event.location}</span>
                    )}
                    {event.device_info && (
                      <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> {event.device_info}</span>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {combinedTimeline.length === 0 && (
          <div className="pl-8 py-8 text-center text-muted">
            No events found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
