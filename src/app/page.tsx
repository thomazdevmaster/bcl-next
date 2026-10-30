"use client";

import { useEffect, useState } from "react";

import {
  type FeedLoadStatus,
  HomePageContent,
} from "@/components/public/HomePageContent";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/core/auth/permissions";
import {
  type HomepageDocument,
  defaultHomepage,
  parseHomepagePayload,
} from "@/domains/homepage/types";
import type { MediaPost } from "@/domains/media/types";
import type { Presentation } from "@/domains/presentations/types";
import { apiFetch } from "@/lib/api";

export default function HomePage() {
  const { isLoggedIn, isHydrated, roles, permissions } = useAuth();
  const [homepage, setHomepage] = useState<HomepageDocument>(defaultHomepage);
  const [events, setEvents] = useState<Presentation[]>([]);
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [feedStatus, setFeedStatus] = useState<{
    events: FeedLoadStatus;
    blog: FeedLoadStatus;
  }>({
    events: "loading",
    blog: "loading",
  });

  useEffect(() => {
    let active = true;
    apiFetch<unknown>("/homepage")
      .then((payload) => {
        if (active) setHomepage(parseHomepagePayload(payload));
      })
      .catch(() => {
        if (active) setHomepage(defaultHomepage());
      });
    apiFetch<Presentation[]>("/presentations")
      .then((presentations) => {
        if (!active) return;
        setEvents(presentations);
        setFeedStatus((current) => ({ ...current, events: "success" }));
      })
      .catch(() => {
        if (!active) return;
        setEvents([]);
        setFeedStatus((current) => ({ ...current, events: "failed" }));
      });
    apiFetch<MediaPost[]>("/media")
      .then((media) => {
        if (!active) return;
        setPosts(media);
        setFeedStatus((current) => ({ ...current, blog: "success" }));
      })
      .catch(() => {
        if (!active) return;
        setPosts([]);
        setFeedStatus((current) => ({ ...current, blog: "failed" }));
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <HomePageContent
      document={homepage}
      events={events}
      posts={posts}
      feedStatus={feedStatus}
      isLoggedIn={isLoggedIn}
      showEditorLink={
        isHydrated && can(roles, "homepage", "update", permissions)
      }
    />
  );
}
