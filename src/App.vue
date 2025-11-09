<template>
  <div class="mood-journal-app">
    <div class="mood-journal-app-content">
      <!-- When authenticated (and allowed via RaLogin.vue), show RA UI -->
      <div v-if="isAuthenticated" class="app-container">
        <div class="mood-journal-app-content-header">
          <div
            v-for="(item, index) in tabList"
            :key="index"
            :class="['tab-item', activeIndex === index ? 'active-item' : '']"
            @click="handleClick(index)"
          >
            {{ item.name }}
          </div>

          <!-- NEW: enable sound + hidden audio element -->
          <button class="sound" @click="primeSound">
            {{ soundEnabled ? 'Sound: On 🔊' : 'Enable Sound 🔔' }}
          </button>
          <audio ref="ding" preload="auto" src="/sounds/notify.wav"></audio>

          <button class="logout" @click="logout">Log Out</button>
        </div>

        <div class="mood-journal-app-content-content">
          <keep-alive>
            <component :is="currentComponent" :journalList="journalList" />
          </keep-alive>
        </div>
      </div>

      <!-- Not signed in → show RA login screen -->
      <div v-else class="login-container">
        <RaLogin />
      </div>
    </div>
  </div>
</template>

<script>
import Journal from './views/Journal';
import RaLogin from './components/RaLogin.vue';

import { auth, db } from './firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default {
  name: 'App',
  components: { Journal, RaLogin },

  data() {
    return {
      isAuthenticated: false,
      journalList: [],
      tabList: [{ name: 'Journal Entries', componentName: 'journal' }],
      activeIndex: 0,
      currentComponent: 'journal',
      _unsubJournals: null,

      soundEnabled: false,
      _initializedStream: false,
      _seenIds: new Set(),
    };
  },

  created() {
    // Gate whole app on Firebase auth state; RaLogin enforces allow-list.
    onAuthStateChanged(auth, (user) => {
      this.isAuthenticated = !!user;

      if (this.isAuthenticated) {
        this.startJournalStream();
      } else {
        this.stopJournalStream();
        this.journalList = [];
        this._seenIds.clear();
        this._initializedStream = false;
      }
    });
  },

  beforeUnmount() {
    this.stopJournalStream();
  },

  methods: {
    handleClick(index) {
      this.activeIndex = index;
      this.currentComponent = this.tabList[index].componentName;
    },

    async logout() {
      try {
        await signOut(auth);
      } catch (e) {
        console.error('Sign out failed:', e);
      }
    },

    primeSound() {
      if (this.soundEnabled) return;
      const el = this.$refs.ding;
      if (!el) return;
      const v = el.volume;
      el.volume = 0.0;
      el.play().catch(() => {});
      setTimeout(() => { el.pause(); el.currentTime = 0; el.volume = v; }, 60);
      this.soundEnabled = true;
    },
    playDing() {
      if (!this.soundEnabled) return;
      const el = this.$refs.ding;
      if (el) {
        el.currentTime = 0;
        el.play().catch(() => {});
      }
    },
    needsReview(data) {
      const imageNeeds   = data?.isApproved === false;
      const therapyNeeds = !!data?.therapy && data?.therapyApproved === false;
      return imageNeeds || therapyNeeds;
    },

    startJournalStream() {
      const q = query(collection(db, 'journalList'), orderBy('timestamp', 'desc'));

      this._unsubJournals = onSnapshot(
        q,
        (snapshot) => {
          // refresh UI list
          this.journalList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            sdImage: doc.data().sdImage || ''
          }));

          snapshot.docChanges().forEach((chg) => {
            const id = chg.doc.id;
            const data = chg.doc.data();

            if (chg.type === 'added') {
              if (!this._initializedStream) {
                this._seenIds.add(id);
                return;
              }
              if (!this._seenIds.has(id) && this.needsReview(data)) {
                this.playDing();
              }
              this._seenIds.add(id);
            }
          });

          this._initializedStream = true;
        },
        (err) => {
          console.error('RA journal stream error:', err);
          this.journalList = [];
        }
      );
    },

    stopJournalStream() {
      if (this._unsubJournals) {
        this._unsubJournals();
        this._unsubJournals = null;
      }
    },
  },
};
</script>

<style lang="less" scoped>
.mood-journal-app {
  height: 100%;
  background: #fff;
  display: flex;
  justify-content: center;

  &-content {
    width: 80%;
    background: #f3f4f6;
    height: 100%;
    padding: 20px;
    display: flex;
    flex-direction: column;

    .app-container {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    &-header {
      flex: none;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 8px;

      .tab-item {
        padding: 4px 20px;
        border-radius: 12px;
        transition: font-size 0.1s ease;
        cursor: pointer;
        user-select: none;
      }

      .active-item {
        font-size: 18px;
        font-weight: bold;
        color: green;
        background-color: #99CC99;
      }

      .sound {
        margin-left: auto;
        padding: 6px 12px;
        border: none;
        border-radius: 8px;
        background: #2563eb;
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }

      .logout {
        margin-left: 8px;
        padding: 6px 14px;
        border: none;
        border-radius: 8px;
        background: #ef4444;
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }
    }

    &-content {
      flex: auto;
      overflow: hidden;
      margin-top: 20px;
    }
  }
}

.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
