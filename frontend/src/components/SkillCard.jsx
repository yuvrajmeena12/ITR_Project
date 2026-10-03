import { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDate, levelLabel } from '../utils/format';
import StarRating from './StarRating';
import { Avatar, Icon, VerifiedBadge } from './ui';

function SkillCard({ skill, onRequestSwap, showOwner = true }) {
  const navigate = useNavigate();
  const owner = skill.owner;

  return (
    <article className="skill-card card-hover" aria-label={`${skill.name} by ${owner ? owner.name : 'you'}`}>
      {showOwner && owner && (
        <div className="skill-card-top">
          <Avatar user={owner} size="sm" />
          <div className="grow">
            <div className="row-wrap" style={{ gap: 6 }}>
              <Link
                to={`/profile/${owner.id}`}
                style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.96rem' }}
              >
                {owner.name}
              </Link>
              {owner.verified && <VerifiedBadge />}
            </div>
            <div className="row xs muted" style={{ gap: 6, marginTop: 2 }}>
              {owner.ratingCount > 0 ? (
                <>
                  <StarRating value={owner.ratingAvg} size="0.82rem" />
                  <span>
                    {owner.ratingAvg.toFixed(1)} ({owner.ratingCount})
                  </span>
                </>
              ) : (
                <span>No ratings yet</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="stack-sm">
        <div className="row spread" style={{ alignItems: 'flex-start', gap: 10 }}>
          <h3 className="skill-name">{skill.name}</h3>
          <span className={`badge ${skill.type === 'teach' ? 'badge-teach' : 'badge-learn'}`}>
            {skill.type === 'teach' ? 'Teaches' : 'Wants to Learn'}
          </span>
        </div>

        <div className="skill-meta">
          <span className="badge">{skill.category}</span>
          <span className="badge">{levelLabel(skill.level)}</span>
          {skill.hasProof && (
            <a
              className="badge badge-completed"
              href={`/api/skills/${skill.id}/proof`}
              target="_blank"
              rel="noopener noreferrer"
              title="Verified certificate or document proof attached"
            >
              <Icon name="doc" size={12} /> Proof Attached
            </a>
          )}
        </div>

        <p className="skill-desc">{skill.description || 'No detailed syllabus or goals provided yet.'}</p>
      </div>

      <div className="skill-foot">
        <span className="xs muted">Listed {formatDate(skill.createdAt)}</span>
        {owner && (
          <div className="skill-actions">
            {skill.type === 'teach' ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onRequestSwap(skill)}
              >
                <Icon name="swap" size={15} /> Request Swap
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => navigate(`/messages/${owner.id}`)}
              >
                <Icon name="spark" size={15} /> Offer to Teach
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(`/messages/${owner.id}`)}
            >
              <Icon name="chat" size={15} /> Message
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default memo(SkillCard);
