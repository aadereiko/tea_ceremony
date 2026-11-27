import { useState } from 'react'
import { Link } from 'react-router'

import { ItemIcon } from '../components/ItemIcon'
import { Heading, KindIcon } from '../components/KindIcon'
import { Leaf } from '../components/Leaf'
import { LikedTeas } from '../components/LikedTeas'
import { forgetRoom, savedRooms } from '../lib/sessions'
import { useConfirm } from '../components/Confirm'

export function HomePage() {
  const [rooms, setRooms] = useState(savedRooms)
  const [confirmDialog, confirm] = useConfirm()
  const removeFromDevice = (slug: string) => {
    forgetRoom(slug)
    setRooms(savedRooms())
  }

  return (
    <main className="wrap">
      <header className="top">
        <span className="brand">
          <Leaf size={26} />
        </span>
        <h1>Tea Ceremony</h1>
        <p className="muted center">Taste teas together, rate them, and find out what you all like.</p>
        <div className="actions home-actions">
          <Link to="/new" className="primary">
            + New room
          </Link>
          <Link to="/join" className="ghost big">
            Join a room
          </Link>
          <Link to="/catalog" className="ghost big with-icon">
            <KindIcon kind="catalog" size={18} />
            Tea catalog
          </Link>
        </div>
      </header>

      {rooms.length > 0 ? (
        <>
          <section className="panel">
            <div className="row-between">
              <Heading kind="room">Your rooms</Heading>
              <span className="muted small">Saved in this browser</span>
            </div>
            <ul className="room-list">
              {rooms.map((r) => (
                <li key={r.slug} className="room-item">
                  <Link to={`/r/${r.slug}`} className="room-link">
                    <ItemIcon name={r.icon ?? 'lantern'} colorFrom={r.name} badge size={24} />
                    <span className="tea-main">
                      <b>{r.name}</b>
                      <span className="tea-sub">as {r.me}</span>
                    </span>
                  </Link>
                  <button
                    className="icon-btn"
                    onClick={() =>
                      confirm({
                        title: 'Remove this room from your list?',
                        message: `“${r.name}” will be forgotten on this device. The room itself stays, and you can join it again with its code and password.`,
                        confirmLabel: 'Remove',
                        danger: true,
                        action: () => removeFromDevice(r.slug),
                      })
                    }
                    aria-label={`Remove ${r.name} from this browser`}
                    title="Remove from this browser"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <LikedTeas rooms={rooms} />
        </>
      ) : (
        <div className="notice">
          No rooms yet. Create one and send the code to your friends, or join a room someone shared with
          you.
        </div>
      )}
      <p className="app-version muted small">Tea Ceremony v{__APP_VERSION__}</p>
      {confirmDialog}
    </main>
  )
}
