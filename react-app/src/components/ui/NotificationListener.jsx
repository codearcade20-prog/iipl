
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useMessage } from '../../context/MessageContext';

const NotificationListener = () => {
    const { user } = useAuth();
    const { toast } = useMessage();

    useEffect(() => {
        if (!user?.id) return;

        console.log('🔔 Notification Listener active for user:', user.username);

        const channel = supabase
            .channel(`issue-updates-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'issue_reports',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    const oldStatus = payload.old?.status;
                    const newStatus = payload.new?.status;

                    if (oldStatus !== 'resolved' && newStatus === 'resolved') {
                        // Play a subtle notification sound
                        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');
                        audio.volume = 0.5;
                        audio.play().catch(e => console.log('Sound blocked by browser'));

                        // Ask for acknowledgment
                        handleAcknowledgment(payload.new.id);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, toast]);

    const handleAcknowledgment = async (reportId) => {
        const ok = window.confirm(
            "The admin has resolved your issue! Please click OK to acknowledge."
        );

        if (ok) {
            try {
                const { error } = await supabase
                    .from('issue_reports')
                    .update({ user_acknowledged: true })
                    .eq('id', reportId);
                
                if (error) throw error;
                console.log('User acknowledged resolution for report:', reportId);
            } catch (err) {
                console.error('Failed to acknowledge report:', err);
            }
        }
    };

    return null; // This component has no UI, it just listens
};

export default NotificationListener;
