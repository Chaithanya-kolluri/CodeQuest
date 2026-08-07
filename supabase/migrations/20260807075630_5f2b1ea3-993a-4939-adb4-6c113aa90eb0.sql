CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  avatar_url text,
  xp integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_solved_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  prompt text NOT NULL,
  difficulty text NOT NULL DEFAULT 'easy',
  xp_reward integer NOT NULL DEFAULT 50,
  starter_js text NOT NULL,
  starter_py text NOT NULL,
  tests jsonb NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.challenges TO anon, authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Challenges are public" ON public.challenges FOR SELECT USING (true);

CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'javascript',
  code text NOT NULL,
  passed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX submissions_user_idx ON public.submissions (user_id, challenge_id);
GRANT SELECT, INSERT ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own submissions" ON public.submissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own submissions" ON public.submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.award_xp_on_pass()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  already_solved boolean;
  reward integer;
  last_day date;
  streak integer;
BEGIN
  IF NOT NEW.passed THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.submissions s
    WHERE s.user_id = NEW.user_id
      AND s.challenge_id = NEW.challenge_id
      AND s.passed
      AND s.id <> NEW.id
  ) INTO already_solved;

  IF already_solved THEN
    RETURN NEW;
  END IF;

  SELECT c.xp_reward INTO reward FROM public.challenges c WHERE c.id = NEW.challenge_id;
  SELECT p.last_solved_on, p.current_streak INTO last_day, streak FROM public.profiles p WHERE p.id = NEW.user_id;

  IF last_day IS NULL THEN
    streak := 1;
  ELSIF last_day = CURRENT_DATE THEN
    streak := GREATEST(COALESCE(streak, 1), 1);
  ELSIF last_day = CURRENT_DATE - 1 THEN
    streak := COALESCE(streak, 0) + 1;
  ELSE
    streak := 1;
  END IF;

  UPDATE public.profiles
  SET xp = xp + COALESCE(reward, 0),
      current_streak = streak,
      longest_streak = GREATEST(longest_streak, streak),
      last_solved_on = CURRENT_DATE,
      updated_at = now()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER submissions_award_xp
AFTER INSERT ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.award_xp_on_pass();

INSERT INTO public.challenges (slug, title, prompt, difficulty, xp_reward, starter_js, starter_py, tests, order_index) VALUES
('sum-two', 'Sum Two Numbers', 'Return the sum of the two numbers `a` and `b`.', 'easy', 50,
 'function solve(a, b) {\n  // your code here\n}', 'def solve(a, b):\n    # your code here\n    pass',
 '{"cases":[{"args":[1,2],"expected":3},{"args":[-5,5],"expected":0},{"args":[120,7],"expected":127}]}', 1),
('reverse-string', 'Reverse String', 'Return the string `s` reversed.', 'easy', 50,
 'function solve(s) {\n  // your code here\n}', 'def solve(s):\n    # your code here\n    pass',
 '{"cases":[{"args":["hello"],"expected":"olleh"},{"args":[""],"expected":""},{"args":["Lovable"],"expected":"elbavoL"}]}', 2),
('max-of-list', 'Largest Number', 'Return the largest number in the list `nums`.', 'easy', 60,
 'function solve(nums) {\n  // your code here\n}', 'def solve(nums):\n    # your code here\n    pass',
 '{"cases":[{"args":[[1,9,3]],"expected":9},{"args":[[-4,-2,-9]],"expected":-2},{"args":[[42]],"expected":42}]}', 3),
('count-vowels', 'Count Vowels', 'Return how many vowels (a, e, i, o, u) appear in the lowercase string `s`.', 'easy', 60,
 'function solve(s) {\n  // your code here\n}', 'def solve(s):\n    # your code here\n    pass',
 '{"cases":[{"args":["hello world"],"expected":3},{"args":["xyz"],"expected":0},{"args":["aeiou"],"expected":5}]}', 4),
('fizzbuzz', 'FizzBuzz List', 'Return a list of length `n` where each position i (starting at 1) is "Fizz" if divisible by 3, "Buzz" if divisible by 5, "FizzBuzz" if both, otherwise the number itself.', 'easy', 70,
 'function solve(n) {\n  // your code here\n}', 'def solve(n):\n    # your code here\n    pass',
 '{"cases":[{"args":[5],"expected":[1,2,"Fizz",4,"Buzz"]},{"args":[3],"expected":[1,2,"Fizz"]},{"args":[15],"expected":[1,2,"Fizz",4,"Buzz","Fizz",7,8,"Fizz","Buzz",11,"Fizz",13,14,"FizzBuzz"]}]}', 5),
('palindrome', 'Palindrome Check', 'Return true if the lowercase string `s` reads the same forwards and backwards, ignoring spaces.', 'medium', 100,
 'function solve(s) {\n  // your code here\n}', 'def solve(s):\n    # your code here\n    pass',
 '{"cases":[{"args":["racecar"],"expected":true},{"args":["never odd or even"],"expected":true},{"args":["lovable"],"expected":false}]}', 6),
('fib-nth', 'Nth Fibonacci', 'Return the nth Fibonacci number where solve(0) = 0 and solve(1) = 1.', 'medium', 100,
 'function solve(n) {\n  // your code here\n}', 'def solve(n):\n    # your code here\n    pass',
 '{"cases":[{"args":[0],"expected":0},{"args":[10],"expected":55},{"args":[25],"expected":75025}]}', 7),
('two-sum', 'Two Sum', 'Return the indices [i, j] (i < j) of the two numbers in `nums` that add up to `target`. Exactly one solution exists.', 'medium', 120,
 'function solve(nums, target) {\n  // your code here\n}', 'def solve(nums, target):\n    # your code here\n    pass',
 '{"cases":[{"args":[[2,7,11,15],9],"expected":[0,1]},{"args":[[3,2,4],6],"expected":[1,2]},{"args":[[1,5,3,8],11],"expected":[2,3]}]}', 8),
('anagram', 'Anagram Check', 'Return true if the two lowercase strings `a` and `b` are anagrams of each other.', 'medium', 100,
 'function solve(a, b) {\n  // your code here\n}', 'def solve(a, b):\n    # your code here\n    pass',
 '{"cases":[{"args":["listen","silent"],"expected":true},{"args":["hello","world"],"expected":false},{"args":["abc","cab"],"expected":true}]}', 9),
('longest-word', 'Longest Word', 'Return the longest word in the sentence `s`. If several tie, return the first one.', 'medium', 90,
 'function solve(s) {\n  // your code here\n}', 'def solve(s):\n    # your code here\n    pass',
 '{"cases":[{"args":["the quick brown fox"],"expected":"quick"},{"args":["code every single day"],"expected":"single"},{"args":["a bb ccc"],"expected":"ccc"}]}', 10),
('digit-sum', 'Sum of Digits', 'Return the sum of the digits of the non-negative integer `n`.', 'medium', 90,
 'function solve(n) {\n  // your code here\n}', 'def solve(n):\n    # your code here\n    pass',
 '{"cases":[{"args":[123],"expected":6},{"args":[0],"expected":0},{"args":[99999],"expected":45}]}', 11),
('count-primes', 'Count Primes', 'Return how many prime numbers are strictly less than `n`.', 'hard', 150,
 'function solve(n) {\n  // your code here\n}', 'def solve(n):\n    # your code here\n    pass',
 '{"cases":[{"args":[10],"expected":4},{"args":[2],"expected":0},{"args":[100],"expected":25}]}', 12),
('roman-to-int', 'Roman to Integer', 'Convert the uppercase Roman numeral string `s` into an integer.', 'hard', 160,
 'function solve(s) {\n  // your code here\n}', 'def solve(s):\n    # your code here\n    pass',
 '{"cases":[{"args":["III"],"expected":3},{"args":["MCMXCIV"],"expected":1994},{"args":["LVIII"],"expected":58}]}', 13),
('balanced-brackets', 'Balanced Brackets', 'Return true if the string `s` of brackets ()[]{} is correctly balanced and nested.', 'hard', 150,
 'function solve(s) {\n  // your code here\n}', 'def solve(s):\n    # your code here\n    pass',
 '{"cases":[{"args":["()[]{}"],"expected":true},{"args":["([)]"],"expected":false},{"args":["{[()]}"],"expected":true}]}', 14);