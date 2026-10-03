import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cachedGet } from '../api/axios';
import { useAsync, useDebounce, useDocumentTitle } from '../hooks/useAsync';
import usePaginated from '../hooks/usePaginated';
import { levelLabel } from '../utils/format';
import RequestSwapModal from '../components/RequestSwapModal';
import SkillCard from '../components/SkillCard';
import { Button, CardSkeletons, EmptyState, ErrorState, Field, Icon, PageHeader } from '../components/ui';

export default function Explore() {
  useDocumentTitle('Explore Skills');
  const [params, setParams] = useSearchParams();
  const [searchText, setSearchText] = useState(params.get('search') || '');
  const search = useDebounce(searchText.trim(), 350);
  const type = params.get('type') === 'learn' ? 'learn' : 'teach';
  const category = params.get('category') || '';
  const level = params.get('level') || '';
  const sort = params.get('sort') || 'newest';
  const [target, setTarget] = useState(null);
  const { data: meta } = useAsync(() => cachedGet('/skills/categories', { ttl: 5 * 60000 }), []);

  const query = useMemo(
    () => ({
      type,
      search: search || undefined,
      category: category || undefined,
      level: level || undefined,
      sort,
    }),
    [type, search, category, level, sort]
  );
  const list = usePaginated('/skills/explore', query, JSON.stringify(query), { limit: 12 });

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const clear = () => {
    setSearchText('');
    setParams({}, { replace: true });
  };

  const filtered = Boolean(search || category || level || type === 'learn');

  return (
    <div className="page">
      <PageHeader
        title="Explore Skills"
        subtitle="Discover passionate members ready to teach or collaborate. Message them directly or propose a swap."
      />

      {/* Filter and Search Bar */}
      <div
        className="card stack"
        style={{
          marginBottom: 28,
        }}
      >
        <div className="row spread" style={{ flexWrap: 'wrap', gap: 14 }}>
          <div className="seg" role="group" aria-label="Skill type selector">
            <button
              type="button"
              aria-pressed={type === 'teach'}
              onClick={() => setFilter('type', '')}
            >
              <Icon name="book" size={15} /> People Teaching
            </button>
            <button
              type="button"
              aria-pressed={type === 'learn'}
              onClick={() => setFilter('type', 'learn')}
            >
              <Icon name="spark" size={15} /> People Learning
            </button>
          </div>

          {filtered && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={clear}
              style={{ color: 'var(--primary)' }}
            >
              <Icon name="close" size={14} /> Clear all filters
            </button>
          )}
        </div>

        <div className="form-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <Field
            label="Search Keywords"
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Python, React, Figma, Japanese…"
            maxLength={60}
          />

          <Field
            as="select"
            label="Category"
            value={category}
            onChange={(e) => setFilter('category', e.target.value)}
          >
            <option value="">All Categories</option>
            {(meta ? meta.categories : []).map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} {type === 'teach' && c.count ? `(${c.count})` : ''}
              </option>
            ))}
          </Field>

          <Field as="select" label="Experience Level" value={level} onChange={(e) => setFilter('level', e.target.value)}>
            <option value="">Any Level</option>
            {(meta ? meta.levels : []).map((l) => (
              <option key={l} value={l}>
                {levelLabel(l)}
              </option>
            ))}
          </Field>

          <Field
            as="select"
            label="Sort Order"
            value={sort}
            onChange={(e) => setFilter('sort', e.target.value === 'newest' ? '' : e.target.value)}
          >
            <option value="newest">Recently Listed</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Alphabetical (A–Z)</option>
          </Field>
        </div>
      </div>

      {/* Skill List Content */}
      {list.loading ? (
        <CardSkeletons count={6} />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : list.items.length === 0 ? (
        <EmptyState
          icon="search"
          title={filtered ? 'No skills match your filters' : 'No skills available yet'}
          action={
            filtered ? (
              <button type="button" className="btn btn-secondary" onClick={clear}>
                Reset Search Filters
              </button>
            ) : undefined
          }
        >
          {filtered
            ? 'Try broadening your search keyword or switching between teaching and learning categories.'
            : 'Be the first pioneer to list a skill in this community!'}
        </EmptyState>
      ) : (
        <>
          <div className="row spread" style={{ marginBottom: 16 }}>
            <span className="small muted font-semibold" aria-live="polite">
              Showing {list.items.length} of {list.total} {list.total === 1 ? 'skill match' : 'skill matches'}
            </span>
          </div>

          <div className="grid grid-3">
            {list.items.map((s) => (
              <SkillCard key={s.id} skill={s} onRequestSwap={setTarget} />
            ))}
          </div>

          {list.hasMore && (
            <div className="center" style={{ marginTop: 32 }}>
              <Button variant="secondary" onClick={list.loadMore} loading={list.loadingMore} size="lg">
                Load More Skills
              </Button>
            </div>
          )}
        </>
      )}

      {target && <RequestSwapModal skill={target} onClose={() => setTarget(null)} />}
    </div>
  );
}
