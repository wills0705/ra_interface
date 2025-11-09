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
import {
  collection,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
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

    // ---- Real-time Firestore stream for RA ----
    startJournalStream() {
      // Stream all entries ordered by newest; RA sees updates live.
      const q = query(
        collection(db, 'journalList'),
        orderBy('timestamp', 'desc')
      );

      // optional: includeMetadataChanges:true to filter pending writes if needed
      this._unsubJournals = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs;
          this.journalList = docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            sdImage: doc.data().sdImage || ''
          }));
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

      .logout {
        margin-left: auto;
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
