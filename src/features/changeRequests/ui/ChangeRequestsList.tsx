import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { changeRequestService, ChangeRequest } from '@/features/changeRequests/services/changeRequestService';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { toast } from 'sonner';

interface Props {
  projectId: string;
  refreshKey?: any;
  readOnly?: boolean;
}

export const ChangeRequestsList: React.FC<Props> = ({ projectId }) => {
  const [items, setItems] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await changeRequestService.listByProject(projectId);
      setItems(data);
    } catch (err: any) {
      toast.error('Failed to load change requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // support external refresh by reloading when refreshKey changes (optional)
  useEffect(() => {
    // noop if no key provided
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div>Loading...</div>;
  if (items.length === 0) return <div className="text-sm text-muted-foreground">No change requests yet.</div>;

  return (
    <div className="space-y-3">
      {items.map((r) => (
        <div key={r.id} className="border rounded p-3 bg-white shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium text-sm">{r.title}</div>
              <div className="text-xs text-muted-foreground">{r.category} • {new Date(r.created_at || '').toLocaleString()}</div>
            </div>
            <div>
              <span className="text-sm font-semibold">{r.status}</span>
            </div>
          </div>
          <div className="mt-2 text-sm">
            <Accordion type="single" collapsible>
              <AccordionItem value={r.id}>
                <AccordionTrigger>
                  <div className="text-sm text-muted-foreground">Description</div>
                </AccordionTrigger>
                <AccordionContent>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(r.description || '') }}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Reference links */}
          {r.reference_links && (
            (() => {
              // Normalize reference links (handle string or array)
              const raw = Array.isArray(r.reference_links)
                ? r.reference_links
                : typeof r.reference_links === 'string'
                ? (() => {
                    try { return JSON.parse(r.reference_links); } catch { return r.reference_links.split(/\r?\n/).map((s:string)=>s.trim()).filter(Boolean); }
                  })()
                : [];

              const links: string[] = Array.isArray(raw) ? raw.map((s:any) => String(s).trim()).filter(Boolean) : [];
              if (links.length === 0) return null;

              return (
                <div className="mt-3">
                  <div className="text-xs font-medium mb-1">Reference links</div>
                  <ul className="list-disc ml-5">
                    {links.map((lnk, idx) => {
                      let label = lnk;
                      try {
                        const url = new URL(lnk);
                        label = `${url.hostname}${url.pathname.length > 1 ? url.pathname : ''}`;
                        if (label.length > 60) label = label.slice(0, 57) + '...';
                      } catch {
                        if (label.length > 60) label = label.slice(0, 57) + '...';
                      }

                      return (
                        <li key={idx}>
                          <a
                            href={lnk}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline break-words"
                            title={lnk}
                          >
                            {label}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()
          )}

          {/* Attachments: show previews for images, open pdfs in new tab, otherwise show link */}
          {r.attachment_urls && r.attachment_urls.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-medium mb-2">Attachments</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {r.attachment_urls.map((u: string, i: number) => {
                  const lower = u.split('?')[0].toLowerCase();
                  const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lower);
                  const isPdf = /\.pdf$/.test(lower);
                  if (isImage) {
                    return (
                      <a key={i} href={u} target="_blank" rel="noreferrer" className="block">
                        <img src={u} alt={`attachment-${i}`} className="max-h-40 w-full object-contain rounded" />
                      </a>
                    );
                  }

                  if (isPdf) {
                    return (
                      <div key={i}>
                        <a href={u} target="_blank" rel="noreferrer" className="text-primary underline">
                          Open PDF
                        </a>
                      </div>
                    );
                  }

                  return (
                    <div key={i}>
                      <a href={u} target="_blank" rel="noreferrer" className="text-primary underline break-all">
                        {u}
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

